import {
  OrderChangeActionDTO,
  OrderChangeDTO,
  OrderDTO,
  OrderWorkflow,
  ReturnDTO,
} from "@medusajs/types"
import { ChangeActionType, OrderChangeStatus } from "@medusajs/utils"
import {
  WorkflowData,
  WorkflowResponse,
  createStep,
  createWorkflow,
} from "@medusajs/workflows-sdk"
import { useRemoteQueryStep } from "../../../common"
import {
  deleteOrderChangeActionsStep,
  previewOrderChangeStep,
} from "../../steps"
import {
  throwIfIsCancelled,
  throwIfOrderChangeIsNotActive,
} from "../../utils/order-validation"

const validationStep = createStep(
  "remove-item-receive-return-action-validation",
  async function ({
    order,
    orderChange,
    orderReturn,
    input,
  }: {
    order: OrderDTO
    orderReturn: ReturnDTO
    orderChange: OrderChangeDTO
    input: OrderWorkflow.DeleteRequestItemReceiveReturnWorkflowInput
  }) {
    throwIfIsCancelled(order, "Order")
    throwIfIsCancelled(orderReturn, "Return")
    throwIfOrderChangeIsNotActive({ orderChange })

    const associatedAction = (orderChange.actions ?? []).find(
      (a) => a.id === input.action_id
    ) as OrderChangeActionDTO

    if (!associatedAction) {
      throw new Error(
        `No request return found for return ${input.return_id} in order change ${orderChange.id}`
      )
    } else if (
      ![
        ChangeActionType.RECEIVE_RETURN_ITEM,
        ChangeActionType.RECEIVE_DAMAGED_RETURN_ITEM,
      ].includes(associatedAction.action as ChangeActionType)
    ) {
      throw new Error(
        `Action ${associatedAction.id} is not receiving item return`
      )
    }
  }
)

export const removeItemReceiveReturnActionWorkflowId =
  "remove-item-receive-return-action"
export const removeItemReceiveReturnActionWorkflow = createWorkflow(
  removeItemReceiveReturnActionWorkflowId,
  function (
    input: WorkflowData<OrderWorkflow.DeleteRequestItemReceiveReturnWorkflowInput>
  ): WorkflowResponse<OrderDTO> {
    const orderReturn: ReturnDTO = useRemoteQueryStep({
      entry_point: "return",
      fields: ["id", "status", "order_id", "canceled_at"],
      variables: { id: input.return_id },
      list: false,
      throw_if_key_not_found: true,
    })

    const order: OrderDTO = useRemoteQueryStep({
      entry_point: "orders",
      fields: ["id", "status", "canceled_at", "items.*"],
      variables: { id: orderReturn.order_id },
      list: false,
      throw_if_key_not_found: true,
    }).config({ name: "order-query" })

    const orderChange: OrderChangeDTO = useRemoteQueryStep({
      entry_point: "order_change",
      fields: ["id", "status", "version", "actions.*"],
      variables: {
        filters: {
          order_id: orderReturn.order_id,
          return_id: orderReturn.id,
          status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED],
        },
      },
      list: false,
    }).config({ name: "order-change-query" })

    validationStep({ order, input, orderReturn, orderChange })

    deleteOrderChangeActionsStep({ ids: [input.action_id] })

    return new WorkflowResponse(previewOrderChangeStep(order.id))
  }
)
