---
name: SSH 접속 불가 대응 매뉴얼
date: 2026-09-30
---
실습용 가상 문서다.

## 적용 대상

SSH 접속이 `Connection refused`, `Connection timed out`, `Permission denied (publickey)`로 실패할 때 적용한다. 콘솔이나 다른 접속 경로로 서버에 들어갈 수 있다는 전제다.

## 조치 순서

1. 오류에 따라 구분한다. `Connection refused`는 서비스가 꺼졌거나 포트가 다른 것이고, `timed out`은 방화벽이나 네트워크 문제이고, `Permission denied`는 인증 문제다.
2. 서버에서 `systemctl status sshd`와 `ss -ltnp | grep sshd`로 서비스가 떠 있고 어느 포트에서 기다리는지 확인한다.
3. `journalctl -u sshd -n 50 --no-pager`로 실패 원인을 확인한다. `Authentication refused: bad ownership or modes`가 보이면 권한 문제다.
4. 키 인증 문제이면 `chmod 700 ~/.ssh`와 `chmod 600 ~/.ssh/authorized_keys`로 권한을 바로잡고 소유자가 해당 계정인지 확인한다.
5. 설정을 고쳤다면 `sshd -t`로 문법을 검사한 뒤 `systemctl reload sshd`로 적용한다.

## 참고

- 짧은 시간에 접속 실패가 반복되면 `fail2ban-client status sshd`로 접속 시도한 쪽이 차단되지 않았는지 확인한다.
- `sshd_config`를 고칠 때는 지금 연결된 세션을 닫지 말고, 새 창으로 접속되는지 확인한 뒤에 닫는다.
- 비밀번호 로그인을 켜는 방식으로 우회하지 않는다. 보안 정책에 어긋난다.
