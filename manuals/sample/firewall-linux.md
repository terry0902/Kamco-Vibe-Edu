---
name: 방화벽 포트 허용 설정 매뉴얼 (Linux)
date: 2026-11-03
---
실습용 가상 문서다. 배포판에 따라 방화벽 도구가 다르다. RHEL, Rocky, CentOS는 `firewalld`, Ubuntu, Debian은 `ufw`를 쓴다.

## 적용 대상

Linux 서버에서 특정 포트로 외부 접속이 안 되거나(`Connection timed out`), 포트를 새로 열거나 닫아야 할 때 적용한다. 서비스는 이미 해당 포트에서 실행 중이라는 전제다.

## 조치 순서 (firewalld: RHEL, Rocky, CentOS)

1. `systemctl status firewalld`로 방화벽이 실행 중인지 확인하고, `firewall-cmd --list-all`로 지금 열려 있는 포트와 서비스를 확인한다.
2. `firewall-cmd --permanent --add-port=<포트>/tcp`로 포트를 허용한다. `--permanent`를 빼면 재부팅이나 재적재 때 사라진다.
3. 특정 대역에서만 허용하려면 `firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<허용할 대역>" port port="<포트>" protocol="tcp" accept'`를 쓴다.
4. `firewall-cmd --reload`로 규칙을 적용한다.
5. `firewall-cmd --list-all`로 규칙이 들어갔는지 확인하고, 다른 서버에서 `nc -zv <서버 주소> <포트>`로 접속되는지 확인한다.

## 조치 순서 (ufw: Ubuntu, Debian)

1. `ufw status verbose`로 방화벽이 켜져 있는지, 어떤 규칙이 있는지 확인한다.
2. 방화벽을 처음 켜는 경우에는 먼저 `ufw allow 22/tcp`로 SSH를 허용한다. 이 순서를 지키지 않으면 원격 접속이 끊긴다.
3. `ufw allow <포트>/tcp`로 포트를 허용한다. 특정 대역만 허용하려면 `ufw allow from <허용할 대역> to any port <포트> proto tcp`를 쓴다.
4. `ufw status numbered`로 규칙이 들어갔는지 확인한다. 규칙을 지울 때는 `ufw delete <번호>`를 쓴다.
5. 다른 서버에서 `nc -zv <서버 주소> <포트>`로 접속되는지 확인한다.

## 참고

- 포트를 열었는데도 접속이 안 되면 서비스가 그 포트에서 기다리는지 `ss -ltnp | grep <포트>`로 먼저 확인한다. 서비스가 `127.0.0.1`에서만 기다리면 방화벽을 열어도 외부에서 접속되지 않는다.
- 규칙을 지울 때는 `firewall-cmd --permanent --remove-port=<포트>/tcp`와 `--reload`를 쓴다.
- 문제를 찾는 동안 `systemctl stop firewalld`나 `ufw disable`로 방화벽을 꺼 두는 방식은 쓰지 않는다. 서버가 그대로 노출된다.
- `iptables`나 `nftables`를 직접 쓰는 서버에서는 위 도구의 규칙과 충돌할 수 있다. `nft list ruleset`으로 먼저 확인하고 담당자에게 알린다.
