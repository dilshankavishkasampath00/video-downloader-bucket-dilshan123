# Frontend QA Checklist

## Smoke & Functional

- [ ] Load the homepage successfully
- [ ] Paste a valid media URL and verify `/api/info` returns metadata
- [ ] Select a format option and start a download
- [ ] Confirm the `/api/progress/:jobId` polling returns status updates
- [ ] Confirm the download button becomes active and the downloadable link is generated
- [ ] Confirm `/health` returns `status: ok`

## Visual / UX

- [ ] Page is responsive at 320px, 480px, 768px, 1024px, 1440px
- [ ] Buttons are visible and clickable
- [ ] No broken images in the hero or result card
- [ ] Inputs are accessible with keyboard navigation
- [ ] Error messages are visible and descriptive

## Accessibility

- [ ] All interactive controls have accessible labels
- [ ] Contrast ratios are sufficient for text and controls
- [ ] Form controls have keyboard focus styles
- [ ] Page can be navigated using only keyboard
- [ ] No critical accessibility issues in Lighthouse audit

## Performance

- [ ] Lighthouse performance score is above 50 for the homepage
- [ ] No huge layout shifts or long blocking scripts
- [ ] Assets are served efficiently from the deployed app

## Deployment / Hosting

- [ ] `render.yaml` is present and correct for Render deployment
- [ ] `Dockerfile` builds successfully and starts the server
- [ ] Live public URL responds with `200` on `/health`
- [ ] Static UI and API routes both work in the deployed environment

## Notes

- The backend requires ffmpeg + yt-dlp and therefore must be hosted on Render or another Docker-compatible platform.
- The frontend can be hosted separately on Vercel if necessary, with proxy rewrites to the Render API.
