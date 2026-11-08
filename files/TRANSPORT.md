# Completed Verify diagnostics access

Run 42484916479 reported failure in campaigns job 128744971773, authoring job 128744971783 and dependent verify job 128747762986. The reports shard, which runs the shared kiosk journey, succeeded on saved head cc2d1f618b695ddc1e28306e8f9774f732a66a69.

These commands were invoked once each, with GH_TOKEN loaded privately from the decrypted fleet bundle. Both exited zero and returned zero bytes:

    gh run view 42484916479 --repo just-every/run-mango --job 128744971773 --log-failed
    gh run view 42484916479 --repo just-every/run-mango --job 128744971783 --log-failed

The artifact metadata endpoint listed retained, unexpired artifacts. These download commands each failed at the redirected Azure Blob endpoint with Forbidden (HTTP 403):

    gh api repos/just-every/run-mango/actions/artifacts/13618678375/zip
    gh api repos/just-every/run-mango/actions/artifacts/13619258497/zip

Sanitized transport error: Get https://productionresultssa5.blob.core.windows.net/<artifact path>: Forbidden. Signed URL queries are excluded. Neither blocked download was retried. Local shard reproduction supplied the actionable assertion; no unavailable CI log content is inferred.

Six GitHub command calls were used for the original run's job metadata, two failed-job log reads, artifact metadata and two attempted artifact downloads. Candidate run discovery and polling must remain within the ten-call task budget.
