#!/bin/bash
# Unattended run of the post-next-wallpaper skill, called from crontab.
# ANTHROPIC_API_KEY must stay unset: with it, Claude in Chrome doesn't load.
# DRY_RUN=1 picks the next works and reports them without posting anything.
# First argument is the slot: "night" (default) or "afternoon".
cd /home/charlie/repos/Upscaler || exit 1
unset ANTHROPIC_API_KEY
LOG=/home/charlie/repos/Upscaler/.social-post.log

SLOT=${1:-night}

# One Tumblr post in three goes out at 16:00 Berlin instead of the US
# evening, to see whether the European afternoon reaches anyone. The day
# is picked by the date, so both runs of one day agree on it.
if [ $(( $(date +%s) / 86400 % 3 )) -eq 0 ]; then
  TUMBLR_SLOT=afternoon
else
  TUMBLR_SLOT=night
fi
if [ "$SLOT" = afternoon ]; then
  [ "$TUMBLR_SLOT" = afternoon ] || exit 0
  TARGETS="to Tumblr only (Pinterest posts in the night run)"
  SPREAD=30
elif [ "$TUMBLR_SLOT" = afternoon ]; then
  TARGETS="to Pinterest only (today's Tumblr post goes out at 16:00)"
  SPREAD=180
else
  TARGETS="to Tumblr and to Pinterest"
  SPREAD=180
fi

# Night: crontab fires at 02:00 Paris (20:00 New York) and a random wait of
# up to three hours spreads posts over the US evening. Afternoon: 16:00
# Berlin plus up to half an hour. Either way not the same minute every day.
if [ -z "$DRY_RUN" ]; then
  WAIT=$((RANDOM % SPREAD))
  echo "=== $(date '+%F %T') waiting $WAIT min" >> "$LOG"
  sleep $((WAIT * 60))
fi
TODAY=$(date +%F)

PROMPT="Use the post-next-wallpaper skill to post the next work $TARGETS. \
This is an unattended scheduled run: nobody will answer questions. \
Before each platform, check research/social-posts.json — if that platform already has an entry with postedAt $TODAY, skip it. \
If a step fails or looks wrong, stop that platform and say why in the report."
if [ -n "$DRY_RUN" ]; then
  PROMPT="Dry run of the post-next-wallpaper skill: do steps 0–2 only (refresh the Tumblr copies, read research/social-posts.json, \
pick the next work for each platform, including the check of the live Pinterest Created tab). \
Do not open any composer, post anything, or edit any file. Report the ref and title you would post on each platform."
fi

{
  echo "=== $(date '+%F %T') $SLOT${DRY_RUN:+ (dry run)}"
  timeout 45m /home/charlie/.local/bin/claude -p "$PROMPT" --chrome --model sonnet \
    --allowedTools=Read,Edit,Write,Glob,Grep,"Bash(node:*)","Bash(cp:*)","Bash(mkdir:*)","Bash(ls:*)","Bash(git commit research/social-posts.json:*)",mcp__claude-in-chrome \
    < /dev/null
  echo
} >> "$LOG" 2>&1
