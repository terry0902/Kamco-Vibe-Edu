---
name: Docker 데몬 문제 해결 안내
date: 2026-11-02
source: https://docs.docker.com/engine/daemon/troubleshoot/
---
Docker 공식 문서의 내용을 실습용으로 요약하고 한국어로 다시 쓴 문서다. 정확한 내용은 원문을 확인한다. 날짜는 원문을 확인한 날짜다.

## 데몬에 연결되지 않을 때

1. `docker info` 또는 `sudo systemctl is-active docker`로 데몬이 실행 중인지 확인한다.
2. `ps aux | grep dockerd`로 프로세스를 확인한다.
3. `env | grep DOCKER_HOST`로 클라이언트가 원격 호스트를 가리키는지 확인한다. 잘못 설정되어 있으면 `unset DOCKER_HOST`를 실행한다.
4. 원격 호스트를 쓰는 경우에는 호스트가 켜져 있는지, 방화벽에 막히지 않았는지 확인한다.

## 데몬이 시작되지 않을 때

같은 옵션이 `/etc/docker/daemon.json`과 `dockerd` 실행 옵션에 함께 있으면 데몬이 시작되지 않는다.

1. `/etc/docker/daemon.json`과 서비스 실행 옵션을 비교한다.
2. 겹치는 옵션을 한쪽에서 뺀다.
3. systemd 설정을 고쳤으면 `sudo systemctl daemon-reload`를 실행한 뒤 Docker를 다시 시작한다.

## 메모리가 부족할 때

컨테이너가 사용 가능한 메모리를 넘어서면 커널의 OOM killer가 컨테이너나 데몬을 종료할 수 있다. 메모리가 충분한 호스트에서 실행하고 컨테이너의 자원 제한을 검토한다.

## 컨테이너의 네트워크가 안 될 때

systemd-networkd 220 이상에서는 IP 포워딩이 기본으로 꺼져 있어 컨테이너가 외부에 접속하지 못할 수 있다.

1. 해당 인터페이스의 `.network` 파일 `[Network]` 항목에 `IPForward=true`를 추가한다.
2. 네트워크 서비스를 다시 시작한다.

## 컨테이너의 DNS가 안 될 때

`/etc/resolv.conf`가 dnsmasq 같은 루프백 주소의 DNS를 가리키면 컨테이너에서 쓸 수 없다.

1. `ps aux | grep dnsmasq`로 dnsmasq가 실행 중인지 확인한다.
2. `/etc/docker/daemon.json`의 `dns` 항목에 사용할 DNS 서버를 지정한다.
3. `sudo service docker restart`로 Docker를 다시 시작한다.
4. `docker pull hello-world`로 확인한다.

## 볼륨이 삭제되지 않을 때

`Device or resource busy`가 나오면 다른 컨테이너가 `/var/lib/docker`를 마운트하고 있을 수 있다. `lsof`로 잡고 있는 프로세스를 찾는다.
