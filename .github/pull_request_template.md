## Summary



## Test plan

- [ ] `npm test` passes locally
- [ ] CI passes

## Checklist

- [ ] **OAuth**: If this branch needs Google login on its Cloudflare preview URL, register the following in the [Google OAuth client config](https://console.cloud.google.com/auth/clients/520908376805-qng7l5f1sj9s0mq7brelq74lalmskdpk.apps.googleusercontent.com?project=timely-tasker):
  - `https://YOUR-BRANCH-NAME.timely-tasker.pages.dev`
  - `https://YOUR-BRANCH-NAME.timely-tasker.pages.dev/callback`
- [ ] If tick state encoding or schema changed, fixtures and both test files updated
- [ ] Both storage modes tested (cloud + localStorage)
