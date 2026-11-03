---
name: DNS 이름 해석 실패 대응 매뉴얼
date: 2026-05-11
---
실습용 가상 문서다.

## 적용 대상

`Temporary failure in name resolution`이나 `Name or service not known`이 나오고, IP 주소로는 접속되는데 도메인 이름으로는 접속되지 않을 때 적용한다.

## 조치 순서

1. `resolvectl status`로 서버가 쓰는 DNS 서버 주소를 확인한다. `/etc/resolv.conf`가 비어 있거나 `127.0.0.53`만 있으면 이 서비스가 DNS를 맡고 있다.
2. `dig <도메인> @<DNS 서버 주소> +short`로 DNS 서버에 직접 물어 응답이 오는지 확인한다.
3. 응답이 없으면 `ping -c 3 <DNS 서버 주소>`와 `ss -uln | grep :53`으로 DNS 서버까지 네트워크가 닿는지 확인한다.
4. DNS 서버는 정상인데 이 서버에서만 실패하면 `systemctl restart systemd-resolved`로 이름 해석 서비스를 다시 시작한다.
5. `getent hosts <도메인>`으로 이름이 해석되는지 다시 확인한다.

## 참고

- 일부 도메인만 실패하면 캐시 문제일 수 있다. `resolvectl flush-caches`로 캐시만 비운다.
- 설정 파일(`/etc/systemd/resolved.conf`)을 고쳤다면 고친 내용을 기록해 두고, 재시작 후에도 실패하면 원래 값으로 되돌린다.
- `dig`가 성공하는데 `getent`가 실패하면 `/etc/nsswitch.conf`의 `hosts` 줄을 확인한다.
