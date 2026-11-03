# 정답률 측정 결과

정답 14/14 (100%), 목표 90% 달성

자동 채점 결과이며, 사람이 아래 답변 전문을 함께 검토한다.

| 번호 | 유형 | 판정 | 답변 종류 | 시간 | 문제 |
|---|---|---|---|---:|---|
| 1 | 매뉴얼 안 | 정답 | manual | 5.3초 |  |
| 2 | 매뉴얼 안 | 정답 | manual | 5.6초 |  |
| 3 | 매뉴얼 안 | 정답 | manual | 3.7초 |  |
| 4 | 매뉴얼 안 | 정답 | manual | 8.2초 |  |
| 5 | 매뉴얼 안 | 정답 | manual | 6.5초 |  |
| 6 | 매뉴얼 안 | 정답 | manual | 5.9초 |  |
| 7 | 매뉴얼 안 | 정답 | manual | 5.5초 |  |
| 8 | 매뉴얼 안 | 정답 | manual | 4.2초 |  |
| 9 | 매뉴얼 안 | 정답 | manual | 6.2초 |  |
| 10 | 매뉴얼 안 | 정답 | manual | 6.3초 |  |
| 11 | 위험 조치 | 정답 | manual | 6.8초 |  |
| 12 | 매뉴얼 밖 | 정답 | web | 11.2초 |  |
| 13 | 매뉴얼 밖 | 정답 | notFound | 9.7초 |  |
| 14 | 모호한 질문 | 정답 | manual | 5.7초 |  |

## 답변 전문

### 1. 어젯밤 DB 백업 작업이 실패했다는 경보가 왔습니다

```text
종류: manual
1. `df -h /backup`으로 백업 저장소의 남은 용량을 확인합니다. 사용률이 95% 이상이면 오래된 백업을 정리하기 전에는 새 백업이 만들어지지 않습니다.
2. `journalctl -u db-backup.service -n 100 --no-pager`로 실패 원인 메시지를 확인합니다.
3. `Permission denied`나 `authentication failed`가 보이면 백업 계정의 권한과 비밀번호 만료 여부를 확인합니다.
4. [주의] 원인을 고친 뒤 `systemctl start db-backup.service`로 백업을 한 번 수동으로 실행합니다.
5. `ls -lh /backup | tail -5`로 새 백업 파일이 생겼고 크기가 평소와 비슷한지 확인합니다. 파일 크기가 평소의 절반 이하이면 중간에 끊긴 것이므로 그 파일로 복구하지 않습니다.
근거: 데이터베이스 백업 실패 대응 매뉴얼 (2026-08-20)
```

### 2. 브라우저에 NET::ERR_CERT_DATE_INVALID가 나옵니다

```text
종류: manual
1. `openssl x509 -enddate -noout -in <인증서 파일>`로 서버에 설치된 인증서의 만료일을 확인합니다.
2. `openssl s_client -connect <호스트명>:443 -servername <호스트명> </dev/null | openssl x509 -noout -dates`로 실제 서비스되는 인증서의 날짜도 확인합니다.
3. `certbot renew --dry-run`으로 갱신을 시험합니다. 실패하면 `/var/log/letsencrypt/letsencrypt.log`에서 원인을 확인합니다.
4. 시험이 통과하면 `certbot renew`로 인증서를 갱신합니다.
5. [주의] `nginx -t`로 설정을 검사한 뒤 `systemctl reload nginx`로 새 인증서를 적용하고, 2번 명령으로 만료일이 바뀌었는지 확인합니다.
근거: TLS 인증서 만료 대응 매뉴얼 (2026-07-02)
```

### 3. 서버에서 Temporary failure in name resolution 에러가 나요. IP로는 접속돼요

```text
종류: manual
1. `resolvectl status`로 서버가 사용하는 DNS 서버 주소를 확인하세요. `/etc/resolv.conf`가 비어 있거나 `127.0.0.53`만 있으면 이 서비스가 DNS를 맡고 있습니다.
2. `dig <도메인> @<DNS 서버 주소> +short`로 DNS 서버에 직접 질의해 응답이 오는지 확인하세요.
3. 응답이 없으면 `ping -c 3 <DNS 서버 주소>`와 `ss -uln | grep :53`으로 DNS 서버까지 네트워크가 닿는지 확인하세요.
4. [주의] DNS 서버는 정상인데 이 서버에서만 실패하면 `systemctl restart systemd-resolved`로 이름 해석 서비스를 다시 시작하세요.
5. `getent hosts <도메인>`으로 이름이 해석되는지 다시 확인하세요.
근거: DNS 이름 해석 실패 대응 매뉴얼 (2026-05-11)
```

### 4. 서버 시각이 다른 서버와 3초 정도 어긋나서 토큰 검증이 clock skew로 실패합니다

```text
종류: manual
1. `timedatectl status`로 `System clock synchronized: yes`인지 확인합니다.
2. `chronyc tracking`으로 `System time` 항목의 현재 오차를 확인하고, `chronyc sources -v`로 시간 서버 연결 상태를 확인합니다. `Reach`가 0이면 시간 서버에 연결되지 않은 것입니다.
3. 연결이 안 되면 `ss -uln | grep :123`과 방화벽에서 UDP 123 포트가 열려 있는지 확인합니다.
4. [주의] `systemctl status chronyd`에서 서비스가 멈춰 있으면 `systemctl restart chronyd`로 다시 시작하고, 1분 뒤 `chronyc tracking`으로 오차가 줄었는지 확인합니다.
5. [주의] 오차가 1초보다 크므로, 서비스 영향이 없는 시간에 `chronyc makestep`으로 시각을 한 번에 맞출 수 있습니다. 시각이 갑자기 바뀌면 실행 중인 작업과 로그 순서에 영향을 줄 수 있습니다.
근거: 시간 동기화(NTP) 오차 대응 매뉴얼 (2026-03-18)
```

### 5. ssh로 접속하면 Permission denied (publickey)가 나와요

```text
종류: manual
1. 이 조치는 콘솔이나 다른 접속 경로로 서버에 들어갈 수 있다는 전제입니다.
2. 서버에서 `systemctl status sshd`와 `ss -ltnp | grep sshd`로 SSH 서비스 상태와 대기 포트를 확인합니다.
3. `journalctl -u sshd -n 50 --no-pager`로 실패 원인을 확인합니다.
4. [주의] 키 인증 문제이면 `chmod 700 ~/.ssh`와 `chmod 600 ~/.ssh/authorized_keys`로 권한을 바로잡고, 소유자가 해당 계정인지 확인합니다.
근거: SSH 접속 불가 대응 매뉴얼 (2026-09-30)
```

### 6. /var/log 아래 로그 파일이 계속 커지기만 하고 지난 로그가 안 생겨요

```text
종류: manual
1. `ls -lh /var/log/<서비스>/`로 커진 로그 파일을 확인합니다.
2. [주의] `systemctl status logrotate.timer`로 로그 정리 타이머 상태를 확인합니다. 꺼져 있으면 `systemctl enable --now logrotate.timer`로 켭니다.
3. `logrotate -d /etc/logrotate.d/<서비스>`로 시험 실행하고 오류 메시지를 확인합니다. `-d`는 실제로 바꾸지 않습니다.
4. [주의] `error: skipping ... because parent directory has insecure permissions`가 나오면 `chmod 755 <폴더>`로 해당 폴더 권한을 고칩니다.
5. 시험이 통과하면 `logrotate -f /etc/logrotate.d/<서비스>`로 한 번 강제로 실행하고, `ls -lh`로 지난 로그가 생겼는지 확인합니다.
근거: 로그 로테이션 미동작 대응 매뉴얼 (2026-02-09)
```

### 7. 앱에서 OOM command not allowed when used memory > 'maxmemory' 오류가 납니다

```text
종류: manual
1. `redis-cli info memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"`로 메모리 사용량, 상한, 단편화 정도를 확인합니다.
2. [주의] `redis-cli config get maxmemory-policy`로 메모리가 가득 찼을 때의 정책을 확인합니다. `noeviction`이면 쓰기가 거절됩니다.
3. `redis-cli --bigkeys`로 용량을 많이 쓰는 키를 찾습니다. 서비스 영향이 있으니 사용량이 적은 시간에 실행합니다.
4. [주의] 만료 시간(TTL) 없이 쌓이는 키가 원인이면 애플리케이션 담당자에게 TTL 설정을 요청합니다. 급하면 어떤 서비스가 쓰는 키인지 확인한 뒤 임시 키를 `redis-cli unlink <키>`로 지웁니다.
근거: Redis 메모리 부족 대응 매뉴얼 (2026-10-05)
```

### 8. 로드 밸런서에서 백엔드 서버가 unhealthy로 표시돼요

```text
종류: manual
1. 로드 밸런서에 설정된 헬스체크 경로와 포트를 확인합니다. 보통 경로는 `/health`입니다.
2. 해당 백엔드 서버에서 `curl -i http://localhost:<포트>/health`를 실행해 `200` 응답이 오는지 확인합니다.
3. 응답이 없으면 `systemctl status <서비스>`와 `ss -ltnp | grep <포트>`로 서비스가 실행 중인지, 해당 포트에서 대기 중인지 확인합니다.
4. 서버 내부에서는 정상인데 로드 밸런서에서만 실패하면 방화벽과 보안 그룹에서 로드 밸런서 주소의 접근이 허용되어 있는지 확인합니다.
5. 서비스를 다시 시작했다면 `curl`로 `200` 응답을 확인한 뒤, 로드 밸런서에서 상태가 `healthy`로 돌아왔는지 확인합니다.
근거: 로드 밸런서 헬스체크 실패 대응 매뉴얼 (2026-06-25)
```

### 9. NFS 마운트한 폴더에서 df를 치면 멈춰요

```text
종류: manual
1. `timeout 5 df -h`로 확인하세요. 응답이 없으면 NFS 마운트가 멈춘 것입니다.
2. `showmount -e <NFS 서버 주소>`로 NFS 서버가 폴더를 내보내고 있는지 확인하세요.
3. `ping -c 3 <NFS 서버 주소>`로 NFS 서버까지 네트워크가 닿는지 확인하세요.
4. [주의] 서버는 정상인데 마운트가 멈춰 있으면 `umount -f -l <마운트 경로>`로 연결을 끊으세요. 해당 폴더를 쓰는 프로세스가 있으면 먼저 담당자에게 알리세요. 쓰던 작업의 데이터가 유실될 수 있습니다.
5. `mount -a`로 다시 연결한 뒤 `timeout 5 df -h`로 정상 응답하는지 확인하세요.
근거: NFS 마운트 장애 대응 매뉴얼 (2025-06-12) 오래된 문서
```

### 10. load average가 코어 수보다 훨씬 높고 ps에 defunct 프로세스가 쌓여요

```text
종류: manual
1. `uptime`으로 `load average`를 확인하고 `nproc`으로 코어 수를 확인하세요. 부하가 코어 수의 2배 이상이면 과부하입니다.
2. `top -o %CPU`나 `ps aux --sort=-%cpu | head -10`으로 CPU를 많이 쓰는 프로세스를 찾으세요. 사용률은 낮은데 부하만 높으면 `iostat -x 1 3`으로 `%iowait`가 높은지 확인하세요.
3. 좀비 프로세스와 부모 PID를 확인하세요: `ps -eo pid,ppid,stat,cmd | awk '$3 ~ /Z/'`. 좀비 자체는 CPU를 쓰지 않으므로 부모 프로세스가 자식을 거두지 못하는 것이 원인입니다.
4. [주의] 부모 프로세스가 담당 서비스라면 먼저 서비스 담당자에게 알린 뒤 `systemctl restart <서비스>`로 다시 시작하세요. 재시작하면 좀비가 함께 정리됩니다.
근거: CPU 과부하·좀비 프로세스 대응 매뉴얼 (2026-04-14)
```

### 11. 인증서를 갱신했는데 nginx에 어떻게 적용하나요

```text
종류: manual
1. `nginx -t`로 nginx 설정을 검사합니다.
2. [주의] 검사가 통과하면 `systemctl reload nginx`로 갱신된 인증서를 적용합니다.
3. `openssl s_client -connect <호스트명>:443 -servername <호스트명> </dev/null | openssl x509 -noout -dates`로 서비스 중인 인증서의 만료일이 바뀌었는지 확인합니다.
근거: TLS 인증서 만료 대응 매뉴얼 (2026-07-02)
```

### 12. Kafka 컨슈머 그룹의 lag이 계속 늘어납니다

```text
종류: web
1. 파티션별 lag 추이를 확인하고, 소비자 처리량과 producer 유입량을 비교하세요. lag가 지속적으로 증가하면 consumer가 producer를 따라가지 못하는 상태입니다.
2. consumer의 `records-lag-max`와 fetch rate를 모니터링하세요. lag가 증가하고 fetch rate가 낮거나 0이면 소비자 측 문제를 좁혀 볼 수 있습니다.
3. consumer group의 리밸런싱 빈도와 지속 시간을 확인하세요. 잦거나 오래 걸리는 리밸런싱은 소비 처리량을 낮춰 lag를 키울 수 있습니다.
4. 소비자 처리 지연, 네트워크 지연, 큰 메시지, 높은 유입량과 함께 `fetch.max.bytes`, `fetch.min.bytes`, `fetch.max.wait.ms`, `max.poll.records` 등 consumer 설정을 점검하세요.
출처: https://docs.confluent.io/cloud/current/monitoring/monitor-lag.html
출처: https://docs.confluent.io/cloud/current/client-apps/jmx-monitoring.html
출처: https://docs.confluent.io/platform/current/monitor/monitor-consumer-lag.html
```

### 13. MongoDB 레플리카셋에서 PRIMARY가 선출되지 않아요

```text
종류: notFound
```

### 14. 서버가 이상해요

```text
후속 입력: ssh 접속할 때 Connection refused가 나요
종류: manual
1. 콘솔이나 다른 접속 경로로 서버에 접속한 뒤 `systemctl status sshd`와 `ss -ltnp | grep sshd`로 SSH 서비스가 실행 중인지, 어느 포트에서 대기 중인지 확인하세요.
2. `journalctl -u sshd -n 50 --no-pager`로 SSH 접속 실패 원인을 확인하세요.
근거: SSH 접속 불가 대응 매뉴얼 (2026-09-30)
```
