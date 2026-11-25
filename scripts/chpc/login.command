#!/bin/bash
cd "$(dirname "$0")/../.." || exit 1
python3 scripts/chpc/narration.py "$@" login
result=$?
if [ "$result" -ne 0 ]; then
  printf '\nSSH sign-in did not complete. Run this file again to retry.\n'
else
  printf '\nSigned in. You can return to Codex; this window can close.\n'
fi
exit "$result"
