#!/usr/bin/env bash
# First labeled-demo E2E smoke (API vertical slice). Not real-footage NLE.
set -euo pipefail

API="${API_BASE:-http://localhost:4000}"
H=(-H "x-kedov-user-id: user_demo" -H "x-kedov-org-id: org_demo" -H "content-type: application/json")
PROJECT=proj_demo_music
PASS=0
FAIL=0

step() {
  echo ""
  echo "==> $1"
}

ok() {
  echo "OK  $1"
  PASS=$((PASS + 1))
}

bad() {
  echo "FAIL $1"
  FAIL=$((FAIL + 1))
}

wait_api() {
  step "Wait for API health"
  for i in $(seq 1 40); do
    if curl -sf "$API/health" >/tmp/kedov_health.json 2>/dev/null; then
      ok "health $(cat /tmp/kedov_health.json)"
      return 0
    fi
    sleep 0.5
  done
  bad "API did not become healthy at $API"
  exit 1
}

wait_api

step "List projects"
curl -sf "${H[@]}" "$API/v1/projects" >/tmp/kedov_projects.json
grep -q "$PROJECT" /tmp/kedov_projects.json && ok "demo project present" || bad "demo project missing"

step "Import session + complete (metadata only)"
IMP=$(curl -sf "${H[@]}" -X POST "$API/v1/projects/$PROJECT/assets/import-sessions" -d '{}')
IMP_ID=$(python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" <<<"$IMP")
curl -sf "${H[@]}" -X POST "$API/v1/import-sessions/$IMP_ID/complete" -d '{
  "files": [
    {"filename": "master.wav", "size_bytes": 1200, "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},
    {"filename": "cam_a.mov", "size_bytes": 5000, "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}
  ]
}' >/tmp/kedov_import.json
grep -q '"READY"\|"QUARANTINED"' /tmp/kedov_import.json && ok "import complete ($IMP_ID)" || bad "import not ready"

step "List sync sessions (seeded demo)"
curl -sf "${H[@]}" "$API/v1/projects/$PROJECT/sync-sessions" >/tmp/kedov_sync.json
grep -q "sync_demo_music\|session_id\|takes" /tmp/kedov_sync.json && ok "sync sessions listed" || bad "sync list empty/unexpected"

step "Preview session + scrub"
PREV=$(curl -sf "${H[@]}" -X POST "$API/v1/projects/$PROJECT/preview-sessions" -d '{"duration_frames":240,"fps_num":24,"fps_den":1,"preview_tier":"proxy"}')
PREV_ID=$(python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" <<<"$PREV")
SCRUB=$(curl -sf "${H[@]}" -X POST "$API/v1/preview-sessions/$PREV_ID/scrub" -d '{"frame_index":48}')
echo "$SCRUB" | grep -q '"playhead_frame":48' && ok "preview scrub gen bumped" || bad "scrub failed: $SCRUB"

step "First-cut plan + apply"
FC=$(curl -sf "${H[@]}" -X POST "$API/v1/projects/$PROJECT/ai/first-cut" -d '{
  "project_id":"'"$PROJECT"'",
  "sequence_id":"seq_main",
  "expected_revision":0,
  "genre":"music_video",
  "candidates":[
    {"asset_id":"asset_take4_close","take_id":"take_4","sync_confidence":0.93,"start_frame":0,"end_frame":72,"source_in_frame":12,"tags":["close_up"],"lip_sync":0.9,"face_visibility":0.88,"focus":0.86,"composition":0.7},
    {"asset_id":"asset_weak","take_id":"take_9","sync_confidence":0.1,"start_frame":72,"end_frame":140,"source_in_frame":0}
  ]
}')
echo "$FC" | grep -q '"plan"' && ok "first-cut plan" || bad "first-cut failed"
PLAN=$(python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)['plan']))" <<<"$FC")
APP=$(curl -sf "${H[@]}" -X POST "$API/v1/projects/$PROJECT/ai/plans/apply" -d "{\"plan\":$PLAN}")
echo "$APP" | grep -q '"ok":true\|"revision":1' && ok "first-cut applied" || bad "apply failed: $APP"

step "Agent prompt plan (unexecuted)"
REV=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('sequence',{}).get('revision',1))" <<<"$APP")
PP=$(curl -sf "${H[@]}" -X POST "$API/v1/projects/$PROJECT/ai/plans" -d '{
  "project_id":"'"$PROJECT"'",
  "sequence_id":"seq_main",
  "expected_revision":'"$REV"',
  "prompt":"Replace chorus with Take 4 close-up and soften blue grade",
  "mode":"preview_then_apply",
  "privacy_mode":"local_first",
  "cloud_consent":false
}')
echo "$PP" | grep -q '"schema_version":"1.0"' && ok "prompt EditPlan" || bad "prompt plan failed: $PP"
echo "$PP" | grep -q '"require_confirmation":true' && ok "require_confirmation set" || bad "confirmation flag missing"

step "OCIO config"
curl -sf "${H[@]}" "$API/v1/color/ocio-config" >/tmp/kedov_ocio.json
grep -qi 'aces\|working\|display\|transforms\|config' /tmp/kedov_ocio.json && ok "ocio config" || bad "ocio missing"

echo ""
echo "======== SMOKE RESULT: $PASS passed, $FAIL failed ========"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
echo "Studio UI (manual): http://localhost:3001/dashboard"
echo "  Import / Sync / First Cut / Agent / Editor for $PROJECT"
