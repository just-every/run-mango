import { readFile } from 'node:fs/promises';
import { ownerWorkerName, ownerResourceName } from '../base-cli/modules/deploy-kit/owner.mjs';

export function deploymentNames(environment = process.env.MANGO_DEPLOY_ENV || 'production') {
  const workerName = ownerWorkerName('just-every/mango', environment);
  return { environment, workerName, databaseName: ownerResourceName(workerName, 'DB'), bucketName: ownerResourceName(workerName, 'ASSETS_BUCKET'), queueName: ownerResourceName(workerName, 'MANGO_JOBS') };
}

export async function readDeployment(environment = process.env.MANGO_DEPLOY_ENV) {
  if (!environment) throw new Error('MANGO_DEPLOY_ENV is required for remote data operations.');
  const { workerName } = deploymentNames(environment);
  const state = JSON.parse(await readFile(`.rer/deploy/${environment}.json`, 'utf8'));
  const database = state.owned?.d1?.[ownerResourceName(workerName, 'DB')];
  if (state.project !== 'just-every/mango' || state.environment !== environment || state.worker !== workerName || database?.status !== 'created' || !database.id) throw new Error('Restore the matching Base owner-account state file before using remote data.');
  return { databaseId: database.id };
}
