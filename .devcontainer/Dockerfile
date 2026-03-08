FROM ubuntu:24.04

RUN apt-get update && apt-get install curl unzip git gh inotify-tools pgtap sqlite3 -y

# Install specific version of postgres client 
# https://www.postgresql.org/download/linux/ubuntu/
RUN apt-get install -y postgresql-common \
    && /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y \
    && apt-get install -y postgresql-client-18


# Install Node 
ENV FNM_PATH="/root/.local/share/fnm"
ENV PATH="$PATH:$FNM_PATH"
RUN curl -o- https://fnm.vercel.app/install | bash \
    && fnm install 24

# And Typescript globally
RUN eval "$(fnm env --shell bash)" && npm install -g typescript

# And Wrangler for Cloudflare Pages/D1 commands used in README
RUN eval "$(fnm env --shell bash)" && npm install -g wrangler

# And Bun
RUN curl -fsSL https://bun.com/install | bash

# Install pgschema for migrations
RUN curl -fsSL https://github.com/pgplex/pgschema/releases/download/v1.7.2/pgschema_1.7.2_amd64.deb -o /tmp/pgschema_1.7.2_amd64.deb \
    && dpkg -i /tmp/pgschema_1.7.2_amd64.deb \
    && rm -f /tmp/pgschema_1.7.2_amd64.deb


CMD [ "/usr/bin/sleep", "infinity" ]
