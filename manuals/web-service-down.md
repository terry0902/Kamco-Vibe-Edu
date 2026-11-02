---
name: 웹 서비스 응답 없음 대응 매뉴얼
date: 2026-05-27
---
실습용 가상 문서다.

## 적용 대상

웹 서비스가 `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`을 돌려주거나 응답하지 않을 때 적용한다.

## 조치 순서

1. `systemctl status nginx`와 `systemctl status <백엔드 서비스>`로 두 서비스의 상태를 확인한다.
2. `tail -n 50 /var/log/nginx/error.log`로 에러 내용을 확인한다. `connect() failed`나 `upstream timed out`이 있으면 백엔드 문제다.
3. `ss -ltnp`로 백엔드가 설정된 포트에서 대기 중인지 확인한다.
4. 백엔드가 멈춰 있으면 `journalctl -u <백엔드 서비스> -n 100`으로 원인을 확인한 뒤 `systemctl restart <백엔드 서비스>`로 재시작한다.
5. 응답이 복구되었는지 `curl -I http://localhost/`로 확인한다. 복구되지 않으면 선임에게 문의한다.

## 참고

- nginx 설정을 고친 뒤에는 `nginx -t`로 검사한 다음 `systemctl reload nginx`를 실행한다.
- 502는 백엔드에 연결하지 못한 경우, 504는 백엔드 응답이 너무 늦은 경우에 주로 나타난다.
