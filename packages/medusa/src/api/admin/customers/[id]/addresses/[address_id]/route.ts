import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "../../../../../../types/routing"
import {
  deleteCustomerAddressesWorkflow,
  updateCustomerAddressesWorkflow,
} from "@medusajs/core-flows"

import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/utils"
import { AdminCreateCustomerAddressType } from "../../../validators"
import { refetchCustomer } from "../../../helpers"
import { AdditionalData } from "@medusajs/types"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "customer_address",
    variables: {
      filters: { id: req.params.address_id, customer_id: req.params.id },
    },
    fields: req.remoteQueryConfig.fields,
  })

  const [address] = await remoteQuery(queryObject)

  res.status(200).json({ address })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<
    AdminCreateCustomerAddressType & AdditionalData
  >,
  res: MedusaResponse
) => {
  const { additional_data, ...rest } = req.validatedBody

  const updateAddresses = updateCustomerAddressesWorkflow(req.scope)
  await updateAddresses.run({
    input: {
      selector: { id: req.params.address_id, customer_id: req.params.id },
      update: rest,
      additional_data,
    },
  })

  const customer = await refetchCustomer(
    req.params.id,
    req.scope,
    req.remoteQueryConfig.fields
  )

  res.status(200).json({ customer })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = req.params.address_id
  const deleteAddress = deleteCustomerAddressesWorkflow(req.scope)

  await deleteAddress.run({
    input: { ids: [id] },
  })

  const customer = await refetchCustomer(
    req.params.id,
    req.scope,
    req.remoteQueryConfig.fields
  )

  res.status(200).json({
    id,
    object: "customer_address",
    deleted: true,
    parent: customer,
  })
}
