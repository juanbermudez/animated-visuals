#!/bin/sh
# Symlink every skill under skills/ into the agents' skill folders (Claude Code and Codex), so a git pull updates
# the installs. An existing real folder is left alone unless --force is given.
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
force=""; [ "$1" = "--force" ] && force=1
for target in "$HOME/.claude/skills" "$HOME/.agents/skills"; do
  mkdir -p "$target"
  for skill in "$root"/skills/*/; do
    name="$(basename "$skill")"; dest="$target/$name"
    if [ -L "$dest" ]; then rm "$dest"
    elif [ -e "$dest" ]; then
      if [ -n "$force" ]; then rm -rf "$dest"; else echo "skip $dest (exists; use --force to replace)"; continue; fi
    fi
    ln -s "${skill%/}" "$dest" && echo "linked $dest -> ${skill%/}"
  done
done
