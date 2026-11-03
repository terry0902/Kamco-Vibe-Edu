---
name: 방화벽 설정 매뉴얼 (macOS)
date: 2026-11-03
---
실습용 가상 문서다. macOS에는 앱 단위로 막는 "응용 프로그램 방화벽"과 포트 단위로 막는 `pf` 방화벽이 있다. 모든 명령은 관리자 권한(`sudo`)으로 실행한다.

## 적용 대상

macOS 서버나 작업용 Mac에서 특정 앱이나 포트로 들어오는 접속이 막히거나, 접속 허용 범위를 조정해야 할 때 적용한다.

## 조치 순서 (앱 단위: 응용 프로그램 방화벽)

1. `/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate`로 방화벽이 켜져 있는지 확인한다. 화면으로는 시스템 설정의 "네트워크"에서 "방화벽"을 연다.
2. `/usr/libexec/ApplicationFirewall/socketfilterfw --listapps`로 허용이나 차단된 앱 목록을 확인한다.
3. 앱의 들어오는 접속을 허용하려면 `/usr/libexec/ApplicationFirewall/socketfilterfw --add <앱 경로>`와 `--unblockapp <앱 경로>`를 차례로 실행한다.
4. 앱을 다시 실행해 접속을 시도하고, 허용 여부를 묻는 창이 뜨면 "허용"을 누른다.
5. 다른 Mac이나 서버에서 `nc -zv <Mac 주소> <포트>`로 접속되는지 확인한다.

## 조치 순서 (포트 단위: pf)

1. `pfctl -s info`로 `pf`가 켜져 있는지(`Status: Enabled`) 확인하고, `pfctl -s rules`로 지금 적용된 규칙을 본다.
2. 규칙 파일(`/etc/pf.conf`)을 고치기 전에 `cp /etc/pf.conf /etc/pf.conf.bak`으로 복사본을 만든다.
3. 파일 끝에 `pass in proto tcp from <허용할 대역> to any port <포트>` 줄을 추가한다.
4. `pfctl -nf /etc/pf.conf`로 문법을 검사하고, 오류가 없으면 `pfctl -f /etc/pf.conf`로 적용한다. 꺼져 있으면 `pfctl -e`로 켠다.
5. `pfctl -s rules`로 규칙이 들어갔는지 확인하고, 다른 서버에서 `nc -zv <Mac 주소> <포트>`로 접속되는지 확인한다.

## 참고

- 포트를 열었는데도 접속이 안 되면 서비스가 그 포트에서 기다리는지 `lsof -iTCP -sTCP:LISTEN -n -P | grep <포트>`로 먼저 확인한다.
- `pf` 규칙은 운영체제 업데이트 때 `/etc/pf.conf`가 초기화될 수 있다. 복사본을 보관하고, 업데이트 뒤에 규칙을 다시 확인한다.
- 문법 검사(`-n`)를 건너뛰고 적용하면 원격 접속이 끊길 수 있다. 원격으로 작업할 때는 반드시 검사한 뒤 적용한다.
- 문제를 찾는 동안 `pfctl -d`나 방화벽 끄기로 방화벽을 꺼 두는 방식은 쓰지 않는다.
- "스텔스 모드"(`socketfilterfw --setstealthmode on`)를 켜면 `ping`에 응답하지 않아 점검 도구가 장애로 오해할 수 있다. 켜기 전에 담당자에게 알린다.
