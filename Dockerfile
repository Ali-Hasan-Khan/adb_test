# Base image (host OS). python:3.8 is required: requirements.txt pins
# Django 3.0.5 / DRF 3.12.2 era packages, and the full (non-slim) variant
# ships a C toolchain needed to build source-only deps (e.g. uWSGI).
FROM python:3.8

# NOTE (2026 fix): this Dockerfile previously installed MongoDB 4.4 from the
# Debian *buster* apt repo. The current python:3.8 base is Debian *bookworm*,
# which only ships libssl3, while mongodb-org 4.4 hard-depends on libssl1.1:
#   mongodb-org-server : Depends: libssl1.1 (>= 1.1.0) but it is not installable
# That can never be satisfied with apt, so MongoDB is no longer installed
# here. The `mongo` service in docker-compose.yml now uses the official
# mongo:4.4 image (Ubuntu-based, bundles its own libssl1.1) instead.
# One-process-per-container is also standard Docker practice; the original
# single-image-for-3-services design was test-setup convenience.

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl xz-utils \
 && rm -rf /var/lib/apt/lists/*

# Node.js for the `app` service (yarn install && yarn start).
# Pinned to Node 16 (LTS, era-correct for react-scripts 4 / webpack 4):
# Node 17+ ships OpenSSL 3 and breaks `yarn start` with
# ERR_OSSL_EVP_UNSUPPORTED (webpack 4 uses md4 hashing).
# Installed from the official nodejs.org tarball instead of the legacy
# dl.yarnpkg.com apt repo, which is unmaintained and fails on bookworm.
ENV NODE_VERSION=16.20.2
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
 && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
 && rm /tmp/node.tar.xz \
 && npm install -g yarn@1.22.22 \
 && node --version && yarn --version

ENV ENV_TYPE staging
ENV MONGO_HOST mongo
ENV MONGO_PORT 27017
##########

ENV PYTHONPATH=$PYTHONPATH:/src/

# copy the dependencies file to the working directory
COPY src/requirements.txt .

# install dependencies
RUN pip install --no-cache-dir -r requirements.txt
