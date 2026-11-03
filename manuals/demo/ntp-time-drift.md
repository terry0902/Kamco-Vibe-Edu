---
name: 시간 동기화(NTP) 오차 대응 매뉴얼
date: 2026-03-18
---
실습용 가상 문서다.

## 적용 대상

서버 시각이 다른 서버와 1초 이상 어긋나거나, 인증서·토큰 검증이 `not yet valid`, `clock skew` 오류로 실패할 때 적용한다.

## 조치 순서

1. `timedatectl status`에서 `System clock synchronized: yes`인지 확인한다. `no`이면 동기화가 안 되고 있는 것이다.
2. `chronyc tracking`으로 현재 오차(`System time` 항목)를 확인한다.
3. `chronyc sources -v`로 시간 서버에 닿는지 확인한다. `Reach`가 0이면 시간 서버에 연결되지 않은 것이다.
4. 연결이 안 되면 `ss -uln | grep :123`과 방화벽에서 UDP 123 포트가 열려 있는지 확인한다.
5. 서비스가 멈춰 있으면 `systemctl restart chronyd`로 다시 시작하고, 1분 뒤 `chronyc tracking`으로 오차가 줄었는지 확인한다.

## 참고

- 오차가 1초보다 크면 `chronyc makestep`으로 시각을 한 번에 맞출 수 있다. 시각이 갑자기 바뀌면 실행 중인 작업과 로그 순서에 영향을 주므로, 서비스 영향이 없는 시간에 한다.
- 가상 머신은 호스트와의 시각 동기화 설정이 시간 서버 동기화와 겹치지 않는지 확인한다.
- 시각대(timezone)가 틀린 경우에는 `timedatectl set-timezone Asia/Seoul`로 바꾼다.
