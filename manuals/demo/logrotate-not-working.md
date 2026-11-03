---
name: 로그 로테이션 미동작 대응 매뉴얼
date: 2026-02-09
---
실습용 가상 문서다.

## 적용 대상

`/var/log` 아래의 로그 파일이 계속 커지기만 하고 `.1`, `.gz` 같은 지난 로그가 만들어지지 않을 때 적용한다.

## 조치 순서

1. `ls -lh /var/log/<서비스>/`로 어떤 로그가 커졌는지 확인한다.
2. `systemctl status logrotate.timer`로 로그 정리 타이머가 켜져 있는지 확인하고, 꺼져 있으면 `systemctl enable --now logrotate.timer`로 켠다.
3. `logrotate -d /etc/logrotate.d/<서비스>`로 시험 실행(`-d`는 실제로 바꾸지 않는다)하고 오류 메시지를 확인한다.
4. `error: skipping ... because parent directory has insecure permissions`가 나오면 해당 폴더의 권한을 `chmod 755 <폴더>`로 고친다.
5. 시험이 통과하면 `logrotate -f /etc/logrotate.d/<서비스>`로 한 번 강제로 실행하고, `ls -lh`로 지난 로그가 생겼는지 확인한다.

## 참고

- `/var/lib/logrotate/status`에서 마지막으로 정리한 시각을 볼 수 있다.
- 서비스가 로그 파일을 계속 잡고 있으면 정리 후에도 새 파일에 기록되지 않는다. 설정에 `copytruncate`나 `postrotate` 재적재 명령이 있는지 확인한다.
- 디스크가 이미 가득 찼다면 이 문서보다 디스크 용량 부족 조치를 먼저 한다.
