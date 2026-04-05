import { listProjectNames } from '#server/services/projects'

export default defineEventHandler(async () => listProjectNames())
