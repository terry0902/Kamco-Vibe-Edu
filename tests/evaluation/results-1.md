# 정답률 측정 결과

정답 20/20 (100%), 목표 90% 달성

자동 채점 결과이며, 사람이 아래 답변 전문을 함께 검토한다.

| 번호 | 유형 | 판정 | 답변 종류 | 시간 | 문제 |
|---|---|---|---|---:|---|
| 1 | 매뉴얼 안 | 정답 | manual | 5.3초 |  |
| 2 | 매뉴얼 안 | 정답 | manual | 4.4초 |  |
| 3 | 매뉴얼 안 | 정답 | manual | 3.5초 |  |
| 4 | 매뉴얼 안 | 정답 | manual | 5.4초 |  |
| 5 | 매뉴얼 안 | 정답 | manual | 3.3초 |  |
| 6 | 매뉴얼 안 | 정답 | manual | 12.2초 |  |
| 7 | 매뉴얼 안 | 정답 | manual | 4.4초 |  |
| 8 | 매뉴얼 안 | 정답 | manual | 5.3초 |  |
| 9 | 매뉴얼 밖 | 정답 | web | 9.7초 |  |
| 10 | 매뉴얼 밖 | 정답 | web | 13.0초 |  |
| 11 | 매뉴얼 밖 | 정답 | web | 10.0초 |  |
| 12 | 매뉴얼 밖 | 정답 | notFound | 9.5초 |  |
| 13 | 매뉴얼 밖 | 정답 | web | 9.7초 |  |
| 14 | 모호한 질문 | 정답 | manual | 7.1초 |  |
| 15 | 모호한 질문 | 정답 | manual | 7.4초 |  |
| 16 | 모호한 질문 | 정답 | escalate | 6.1초 |  |
| 17 | 문서 충돌·오래된 문서 | 정답 | conflict | 5.4초 |  |
| 18 | 문서 충돌·오래된 문서 | 정답 | manual | 3.7초 |  |
| 19 | 위험 조치 | 정답 | manual | 7.1초 |  |
| 20 | 위험 조치 | 정답 | manual | 3.0초 |  |

## 답변 전문

### 1. /var 파티션에 쓰기를 하면 write error: No space left on device 가 나옵니다

```text
종류: manual
1. `df -h`로 가득 찬 파일시스템을 확인합니다. 용량에 여유가 있으면 `df -i`로 inode 사용률도 확인합니다.
2. `du -xh --max-depth=1 /var | sort -h`로 용량을 많이 쓰는 폴더를 찾습니다.
3. [주의] 지워도 되는 대상을 고릅니다. `/var/log` 아래의 압축된 지난 로그와 작업이 끝난 임시 파일이 우선 대상입니다.
4. [주의] 선택한 대상 파일을 삭제합니다. 데이터 파일과 현재 쓰고 있는 로그는 삭제하지 않습니다.
5. `df -h`로 사용률이 80% 아래로 내려갔는지 확인합니다. 내려가지 않으면 선임에게 문의합니다.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 2. df로 보면 용량은 남았는데 파일이 안 만들어져요. inode가 찬 것 같아요

```text
종류: manual
1. `df -i`로 inode 사용률을 확인합니다.
2. [주의] inode가 가득 찬 경우 작은 파일이 많은 폴더를 찾아 정리합니다. 삭제할 파일은 지워도 되는 대상인지 확인하고, 데이터 파일과 현재 사용 중인 로그는 삭제하지 않습니다.
3. `df -i`로 inode 사용률이 내려갔는지 확인합니다.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 3. 시스템 로그에 Out of memory: Killed process 가 보이고 서비스가 죽었습니다

```text
종류: manual
1. [주의] `journalctl -k | grep -i "out of memory"`로 강제 종료된 프로세스와 시각을 확인합니다.
2. `free -h`로 현재 메모리와 스왑 사용량을 확인합니다. `free`가 아니라 `available` 값을 기준으로 판단합니다.
3. `ps aux --sort=-%mem | head`로 메모리를 많이 쓰는 프로세스를 찾습니다.
4. [주의] `systemctl status <서비스>`로 종료된 서비스가 다시 떠 있는지 확인합니다. 떠 있지 않으면 `systemctl restart <서비스>`로 재시작합니다.
5. [주의] 같은 프로세스가 반복해서 종료되면 임의로 메모리 한도를 바꾸지 말고 서비스 담당자에게 사용량 증가 원인을 확인합니다.
근거: 메모리 부족(OOM) 대응 매뉴얼 (2026-08-20)
```

### 4. 시스템 로그에 eth0 Link is Down이 계속 찍혀요

```text
종류: manual
1. `ip -br link`로 네트워크 인터페이스가 `UP` 상태인지 확인합니다.
2. `ip -br addr`로 주소가 할당되어 있는지, `ip route`로 기본 경로가 있는지 확인합니다.
3. `journalctl -k | grep -i "link is"`로 링크가 끊겼다 붙기를 반복하는지 확인합니다. 반복하면 케이블과 스위치 포트 점검을 요청합니다.
4. [주의] 인터페이스가 내려가 있으면 `ip link set <인터페이스> up`으로 올립니다.
5. 그래도 복구되지 않으면 선임에게 문의합니다.
근거: 네트워크 연결 장애 대응 매뉴얼 (2026-07-08)
```

### 5. 사이트 접속하면 504 Gateway Timeout이 나옵니다

```text
종류: manual
1. `systemctl status nginx`와 `systemctl status <백엔드 서비스>`로 두 서비스의 상태를 확인합니다.
2. `tail -n 50 /var/log/nginx/error.log`로 에러 내용을 확인합니다. `connect() failed`나 `upstream timed out`이 있으면 백엔드 문제입니다.
3. `ss -ltnp`로 백엔드가 설정된 포트에서 대기 중인지 확인합니다.
4. [주의] 백엔드가 멈춰 있으면 `journalctl -u <백엔드 서비스> -n 100`으로 원인을 확인한 뒤 `systemctl restart <백엔드 서비스>`로 재시작합니다.
5. `curl -I http://localhost/`로 응답이 복구되었는지 확인합니다. 복구되지 않으면 선임에게 문의합니다.
근거: 웹 서비스 응답 없음 대응 매뉴얼 (2026-05-27)
```

### 6. 파드가 노드에는 올라갔는데 이미지를 못 받아서 Waiting 상태예요

```text
종류: manual
1. `kubectl describe pods <파드 이름>`으로 원인을 확인합니다.
2. 이미지 이름이 맞는지 확인합니다.
3. 이미지가 레지스트리에 올라가 있는지 확인합니다.
4. `docker pull <이미지>`처럼 직접 받아 보며 확인합니다.
근거: Kubernetes 파드 장애 확인 안내 (2026-08-24)
```

### 7. docker 명령을 치면 Cannot connect to the Docker daemon 이라고 나와요

```text
종류: manual
1. `docker info` 또는 `sudo systemctl is-active docker`로 데몬이 실행 중인지 확인하세요.
2. `ps aux | grep dockerd`로 Docker 데몬 프로세스를 확인하세요.
3. [주의] `env | grep DOCKER_HOST`로 클라이언트가 원격 호스트를 가리키는지 확인하세요. 잘못 설정되어 있으면 `unset DOCKER_HOST`를 실행하세요.
4. 원격 호스트를 사용하는 경우 호스트가 켜져 있는지, 방화벽에 막히지 않았는지 확인하세요.
근거: Docker 데몬 문제 해결 안내 (2026-11-02)
```

### 8. 커널 로그에 NVRM: Xid 메시지가 보이는데 어떻게 확인하나요

```text
종류: manual
1. `grep "NVRM: Xid" /var/log/syslog`로 Xid 기록을 찾습니다. 배포판에 따라 `/var/log/messages`도 확인합니다.
2. `nvidia-smi -q`로 GPU 상태를 확인합니다. Xid 48처럼 ECC 관련 오류면 ECC 오류 수도 확인합니다.
3. DCGM 진단으로 ECC, PCIe, 대역폭 상태를 점검합니다.
4. 원인별로 확인합니다. 사용자 프로그램 문제는 Compute Sanitizer의 memcheck 또는 CUDA-GDB로 확인하고, 하드웨어 문제는 하드웨어 공급사에 진단을 요청하며, 드라이버 문제는 보고서를 첨부해 NVIDIA에 신고합니다.
5. 드라이버나 하드웨어 문제가 의심되면 `sudo nvidia-bug-report.sh`로 보고서를 만듭니다. 이 작업은 최대 1시간까지 걸릴 수 있습니다.
근거: NVIDIA GPU Xid 오류 확인 안내 (2026-09-09)
```

### 9. PostgreSQL에서 FATAL: too many connections for role 에러가 납니다

```text
종류: web
1. 관리자 권한으로 접속해 역할별 연결 한도를 확인합니다: `SELECT rolname, rolconnlimit FROM pg_roles WHERE rolname = '역할명';`
2. 현재 그 역할이 사용 중인 연결 수를 확인합니다: `SELECT count(*) FROM pg_stat_activity WHERE usename = '역할명';`
3. [주의] 한도에 도달했다면 애플리케이션의 연결 누수를 점검하고, 유휴 연결이 쌓이지 않도록 연결을 닫거나 애플리케이션 연결 풀의 최대 연결 수를 낮춥니다.
4. [주의] 필요하고 서버 자원이 충분한 경우에만 역할의 연결 한도를 조정합니다: `ALTER ROLE 역할명 CONNECTION LIMIT 새_한도;`
출처: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.InitialTroubleshooting.html
출처: https://doc.rockdata.net/errors/too_many_connections/
```

### 10. Tomcat에서 java.lang.OutOfMemoryError: Metaspace 가 발생합니다

```text
종류: web
1. Tomcat을 실행하는 JVM 옵션에 `-XX:MaxMetaspaceSize`가 설정되어 있는지 확인합니다. 이 옵션은 Metaspace 사용 상한을 정합니다.
2. [주의] 상한이 설정되어 있다면 현재 값보다 크게 조정합니다. 예: `-XX:MaxMetaspaceSize=<더 큰 값>`을 Tomcat 실행 환경의 JVM 옵션에 반영합니다. 메모리 여유를 확인한 뒤 변경하세요.
3. 상한을 높여도 문제가 반복되면, 애플리케이션이 클래스 메타데이터를 계속 붙잡는 메모리 누수 가능성도 확인합니다. Oracle은 Metaspace에서 Full GC를 반복해도 회수량이 거의 없는 경우 메모리 누수 가능성을 살펴보도록 안내합니다.
출처: https://docs.oracle.com/en/java/javase/24/troubleshoot/troubleshooting-guide.pdf
출처: https://docs.oracle.com/en/java/javase/22/troubleshoot/troubleshooting-memory-leaks.html
```

### 11. Windows Server 이벤트 로그에 Kernel-Power 41이 남고 재부팅됩니다

```text
종류: web
1. [주의] 이벤트 ID 41은 예기치 않은 종료를 기록하지만, 그 자체로 원인을 특정하지는 않습니다. 이벤트 뷰어의 Windows 로그 > 시스템에서 같은 시각의 이벤트 ID 1001, 6008, 1074도 확인해 재부팅 유형을 구분합니다.
2. [주의] 이벤트 41의 세부 정보에서 BugcheckCode가 0이 아닌지 확인합니다. 코드가 있으면 해당 중지 오류(버그 검사) 코드와 이벤트 1001의 덤프 경로를 확인하고, 같은 시각에 기록된 시스템 로그 오류를 살펴봅니다.
3. [주의] 이벤트 ID 19(WindowsUpdateClient), 7045(Service Control Manager)와 재부팅 직전의 드라이버·업데이트·소프트웨어 설치 이력을 대조합니다. 문제 시작 전에 변경된 항목이 있다면 해당 드라이버나 업데이트를 제거하거나 이전 버전으로 롤백합니다.
4. BugcheckCode가 0이거나 버그체크 이벤트가 없으면 전원 공급 중단·전원 공급 장치 문제 가능성도 확인하고, 시스템 제조업체의 하드웨어 진단을 실행합니다.
출처: https://learn.microsoft.com/en-us/troubleshoot/windows-server/performance/troubleshoot-unexpected-reboots-system-event-logs
출처: https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/event-id-41-restart
```

### 12. BGP 피어가 Idle 상태에서 올라오지 않습니다

```text
종류: notFound
```

### 13. Elasticsearch 클러스터 상태가 red이고 샤드가 unassigned입니다

```text
종류: web
1. 클러스터 상태와 미할당 샤드를 확인합니다: `GET _cluster/health?filter_path=status,*_shards` 및 `GET _cat/shards?v=true&h=index,shard,prirep,state,node,unassigned.reason&s=state`를 실행합니다. 상태가 red이면 기본(primary) 샤드가 하나 이상 미할당된 것입니다.
2. 미할당 샤드의 원인을 확인합니다. 해당 샤드의 인덱스명과 번호를 넣어 `GET _cluster/allocation/explain`에 다음 본문을 전달합니다: `{"index":"인덱스명","shard":샤드번호,"primary":true}`.
3. [주의] 설명 결과에 따라 원인을 해결합니다. 노드 이탈이면 노드를 복구해 클러스터에 다시 참여시키고, 디스크 부족이면 디스크 공간을 확보합니다. 할당 규칙이나 설정이 원인이라면 해당 규칙·설정을 점검합니다.
4. [주의] 할당이 비활성화된 것으로 확인되면 설정을 확인합니다: `GET _cluster/settings?include_defaults=true&filter_path=*.cluster.routing.allocation.enable`. 비활성화가 원인일 때는 다음 요청으로 설정을 초기화해 할당을 다시 활성화합니다: `PUT _cluster/settings` 본문 `{"persistent":{"cluster.routing.allocation.enable":null}}`.
5. 원인을 해결한 뒤 상태를 확인합니다: `GET _cluster/health`. 기본 샤드에 유효한 사본이 없다고 설명되는 경우, 복구 가능한 노드가 있는지 확인하고 없다면 스냅샷 복원을 검토합니다. 데이터 손실을 허용하는 빈 샤드 할당은 마지막 수단입니다.
출처: https://www.elastic.co/docs/troubleshoot/elasticsearch/red-yellow-cluster-status
출처: https://www.elastic.co/docs/troubleshoot/monitoring/unavailable-shards
```

### 14. 서버가 좀 이상한 것 같아요

```text
후속 입력: 디스크가 가득 찼다고 No space left on device가 나와요
종류: manual
1. `df -h`로 가득 찬 파일시스템을 확인하세요. 용량에 여유가 있으면 `df -i`로 inode 사용률도 확인하세요.
2. `du -xh --max-depth=1 <마운트 경로> | sort -h`로 용량을 많이 쓰는 폴더를 찾으세요.
3. [주의] 지워도 되는 대상을 고르세요. `/var/log` 아래의 압축된 지난 로그나 작업이 끝난 임시 파일이 우선 대상입니다. 데이터 파일과 현재 쓰고 있는 로그는 삭제하지 마세요.
4. [주의] 선택한 대상 파일을 삭제하세요.
5. `df -h`로 사용률이 80% 아래로 내려갔는지 확인하세요. 내려가지 않으면 선임에게 문의하세요.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 15. 에러가 나요

```text
후속 입력: nginx에서 502 Bad Gateway가 나요
종류: manual
1. `systemctl status nginx`와 `systemctl status <백엔드 서비스>`로 두 서비스의 상태를 확인합니다.
2. `tail -n 50 /var/log/nginx/error.log`로 에러 내용을 확인합니다. `connect() failed`가 있으면 백엔드 문제일 수 있습니다.
3. `ss -ltnp`로 백엔드가 설정된 포트에서 대기 중인지 확인합니다.
4. [주의] 백엔드가 멈춰 있으면 `journalctl -u <백엔드 서비스> -n 100`으로 원인을 확인한 뒤 `systemctl restart <백엔드 서비스>`로 재시작합니다.
5. `curl -I http://localhost/`로 응답이 복구되었는지 확인합니다. 복구되지 않으면 선임에게 문의합니다.
근거: 웹 서비스 응답 없음 대응 매뉴얼 (2026-05-27)
```

### 16. 많이 느려요

```text
후속 입력: 저도 잘 모르겠어요
종류: escalate
```

### 17. GPU 서버 온도 경보가 떴어요. 어떻게 조치하나요

```text
종류: conflict
문서: 서버 과열 대응 매뉴얼 (2026-06-10)
  1. `ipmitool sdr type temperature`로 흡기, CPU, GPU 온도를 확인합니다. GPU 서버는 `nvidia-smi`도 함께 확인합니다.
  2. `ipmitool sdr type fan`으로 멈춘 팬이 있는지 확인합니다.
  3. 온도가 85도 이상이면 서비스 담당자에게 알리고 작업을 다른 서버로 옮깁니다.
  4. [주의] 작업을 옮긴 뒤 `shutdown -h now`로 서버를 정상 종료합니다.
  5. [주의] 냉각 점검을 요청하고, 점검이 끝나면 서버를 켠 뒤 온도를 다시 확인합니다.
문서: 서버실 온도 경보 조치 지침 (2026-03-22)
  1. `ipmitool sdr type temperature`로 서버 온도를 확인합니다.
  2. 온도가 90도 미만이면 `ipmitool sdr type fan`으로 팬 상태를 확인하고 10분 동안 지켜봅니다.
  3. [주의] 온도가 90도 이상이면 작업을 옮기지 말고 즉시 `shutdown -h now`로 서버를 종료합니다.
  4. 시설 담당자에게 냉방 점검을 요청합니다.
  5. [주의] 온도가 정상으로 돌아오면 서버를 켜고 작업을 다시 시작합니다.
```

### 18. /proc/mdstat에 [U_]가 보이고 디스크 하나가 빠진 것 같습니다

```text
종류: manual
1. `cat /proc/mdstat`로 성능 저하 상태인 RAID 장치를 확인합니다.
2. `mdadm --detail /dev/md0`로 장애 디스크를 확인합니다. `md0`은 확인한 장치 이름으로 바꿉니다.
3. 디스크를 교체하기 전에 백업 상태를 확인합니다.
4. [주의] `mdadm /dev/md0 --fail <디스크> --remove <디스크>`로 장애 디스크를 RAID에서 뺍니다. 디스크를 교체한 뒤 `mdadm /dev/md0 --add <새 디스크>`로 추가합니다.
5. `cat /proc/mdstat`로 재구성이 끝날 때까지 진행률을 확인합니다. 재구성 중에는 부하가 큰 작업을 미룹니다.
근거: RAID 디스크 장애 대응 매뉴얼 (2025-02-18) 오래된 문서
```

### 19. 디스크가 꽉 찼는데 로그를 어떻게 정리하면 되나요

```text
종류: manual
1. `df -h`로 가득 찬 파일시스템을 확인하세요. 용량에 여유가 있다면 `df -i`로 inode 사용률도 확인하세요.
2. `du -xh --max-depth=1 <마운트 경로> | sort -h`로 용량을 많이 쓰는 폴더를 찾으세요.
3. [주의] 지워도 되는 대상으로 `/var/log` 아래 압축된 지난 로그나 작업이 끝난 임시 파일을 우선 검토하세요. 데이터 파일과 현재 쓰고 있는 로그는 삭제하지 마세요.
4. [주의] 확인한 대상 파일만 삭제하세요. 현재 쓰는 로그를 비워야 한다면 파일을 삭제하지 말고 `truncate -s 0 <파일>`을 사용하세요.
5. `df -h`로 사용률이 80% 아래로 내려갔는지 확인하세요. 내려가지 않으면 선임에게 문의하세요.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 20. 백엔드가 죽어서 502가 납니다. 서비스를 어떻게 살리나요

```text
종류: manual
1. `systemctl status nginx`와 `systemctl status <백엔드 서비스>`로 두 서비스의 상태를 확인합니다.
2. `tail -n 50 /var/log/nginx/error.log`로 에러 내용을 확인합니다.
3. `ss -ltnp`로 백엔드가 설정된 포트에서 대기 중인지 확인합니다.
4. [주의] 백엔드가 멈춰 있으면 `journalctl -u <백엔드 서비스> -n 100`으로 원인을 확인한 뒤 `systemctl restart <백엔드 서비스>`로 재시작합니다.
5. `curl -I http://localhost/`로 응답이 복구되었는지 확인합니다. 복구되지 않으면 선임에게 문의합니다.
근거: 웹 서비스 응답 없음 대응 매뉴얼 (2026-05-27)
```
