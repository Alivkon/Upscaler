#!/bin/bash
# Unattended run of the post-next-wallpaper skill, called from crontab.
# ANTHROPIC_API_KEY must stay unset: with it, Claude in Chrome doesn't load.
# DRY_RUN=1 picks the next works and reports them without posting anything.
cd /home/charlie/repos/Upscaler || exit 1
unset ANTHROPIC_API_KEY
LOG=/home/charlie/repos/Upscaler/.social-post.log
TODAY=$(date +%F)

PROMPT="Use the post-next-wallpaper skill to post the next work to Tumblr and to Pinterest. \
This is an unattended scheduled run: nobody will answer questions. \
Before each platform, check research/social-posts.json — if that platform already has an entry with postedAt $TODAY, skip it. \
If a step fails or looks wrong, stop that platform and say why in the report."
if [ -n "$DRY_RUN" ]; then
  PROMPT="Dry run of the post-next-wallpaper skill: do steps 0–2 only (refresh the Tumblr copies, read research/social-posts.json, \
pick the next work for each platform, including the check of the live Pinterest Created tab). \
Do not open any composer, post anything, or edit any file. Report the ref and title you would post on each platform."
fi

{
  echo "=== $(date '+%F %T')${DRY_RUN:+ (dry run)}"
  timeout 45m /home/charlie/.local/bin/claude -p "$PROMPT" --chrome --model sonnet \
    --allowedTools=Read,Edit,Write,Glob,Grep,"Bash(node:*)","Bash(cp:*)","Bash(mkdir:*)","Bash(ls:*)",mcp__claude-in-chrome \
    < /dev/null
  echo
} >> "$LOG" 2>&1
