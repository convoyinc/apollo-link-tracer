#!/usr/bin/env bash
set -e

announce() { >&2 echo $1; }

# Use relaunch to bring old docker containers to life. If it
# returns a non-zero exit code, you'll have to run the docker
# container yourself.
# E.g.
#
#   if [[ "$(relaunch $DOCKER_CONTAINER_NAME)" -ne "0" ]]; then
#     docker run -d --name $DOCKER_CONTAINER_NAME $DOCKER_IMAGE;
#   fi
relaunch() {
  local name=$1
  local ALIVE=`docker ps -f name=$name -f status=running -q`
  local STOPPED=`docker ps -f name=$name -f status=exited -q`
  if [[ -n $STOPPED ]]; then
    announce "Restarting stopped $name container ID $STOPPED ('docker rm $STOPPED' to force a fresh copy)"
    docker start $STOPPED > /dev/null 2>&1
    echo 0
  elif [[ -n $ALIVE ]]; then
    announce "$name container is running, ID $ALIVE"
    echo 0
  else
    # could not relaunch
    echo 1
  fi
}

announce "All done"
