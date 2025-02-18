import {
  ApiKeyDTO,
  FilterableApiKeyProps,
  UpdateApiKeyDTO,
} from "@medusajs/types"
import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/workflows-sdk"
import { updateApiKeysStep } from "../steps"

type UpdateApiKeysStepInput = {
  selector: FilterableApiKeyProps
  update: UpdateApiKeyDTO
}

type WorkflowInput = UpdateApiKeysStepInput

export const updateApiKeysWorkflowId = "update-api-keys"
export const updateApiKeysWorkflow = createWorkflow(
  updateApiKeysWorkflowId,
  (input: WorkflowData<WorkflowInput>): WorkflowResponse<ApiKeyDTO[]> => {
    return new WorkflowResponse(updateApiKeysStep(input))
  }
)
