#!/bin/bash
set -e

# Named volume が root 所有で作成されるため、node ユーザーに権限を付与
# .config には firebase login の認証情報が入る
for dir in /app/packages/web/node_modules /home/node/.config; do
  if [ -d "$dir" ] && [ "$(stat -c '%u' "$dir")" != "$(id -u node)" ]; then
    chown -R node:node "$dir"
  fi
done

exec gosu node "$@"
