# 정답률 측정 결과

정답 20/20 (100%), 목표 90% 달성

자동 채점 결과이며, 사람이 아래 답변 전문을 함께 검토한다.

| 번호 | 유형 | 판정 | 답변 종류 | 시간 | 문제 |
|---|---|---|---|---:|---|
| 1 | 매뉴얼 안 | 정답 | manual | 5.0초 |  |
| 2 | 매뉴얼 안 | 정답 | manual | 4.3초 |  |
| 3 | 매뉴얼 안 | 정답 | manual | 3.9초 |  |
| 4 | 매뉴얼 안 | 정답 | manual | 6.4초 |  |
| 5 | 매뉴얼 안 | 정답 | manual | 4.0초 |  |
| 6 | 매뉴얼 안 | 정답 | manual | 3.2초 |  |
| 7 | 매뉴얼 안 | 정답 | manual | 4.2초 |  |
| 8 | 매뉴얼 안 | 정답 | manual | 4.0초 |  |
| 9 | 매뉴얼 밖 | 정답 | web | 8.0초 |  |
| 10 | 매뉴얼 밖 | 정답 | web | 7.5초 |  |
| 11 | 매뉴얼 밖 | 정답 | web | 9.0초 |  |
| 12 | 매뉴얼 밖 | 정답 | notFound | 8.8초 |  |
| 13 | 매뉴얼 밖 | 정답 | web | 10.1초 |  |
| 14 | 모호한 질문 | 정답 | manual | 7.9초 |  |
| 15 | 모호한 질문 | 정답 | manual | 7.0초 |  |
| 16 | 모호한 질문 | 정답 | escalate | 5.4초 |  |
| 17 | 문서 충돌·오래된 문서 | 정답 | conflict | 5.9초 |  |
| 18 | 문서 충돌·오래된 문서 | 정답 | manual | 3.8초 |  |
| 19 | 위험 조치 | 정답 | manual | 5.1초 |  |
| 20 | 위험 조치 | 정답 | manual | 4.9초 |  |

## 답변 전문

### 1. /var 파티션에 쓰기를 하면 write error: No space left on device 가 나옵니다

```text
종류: manual
1. `df -h`로 가득 찬 파일시스템을 확인합니다. 용량에 여유가 있으면 `df -i`로 inode 사용률도 확인합니다.
2. `du -xh --max-depth=1 <마운트 경로> | sort -h`로 용량을 많이 쓰는 폴더를 찾습니다.
3. [주의] 지워도 되는 대상을 고릅니다. `/var/log` 아래의 압축된 지난 로그와 작업이 끝난 임시 파일이 우선 대상입니다. 데이터 파일과 현재 쓰고 있는 로그는 삭제하지 않습니다.
4. [주의] 선택한 대상 파일을 삭제합니다.
5. `df -h`로 사용률이 80% 아래로 내려갔는지 확인합니다. 내려가지 않으면 선임에게 문의합니다.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 2. df로 보면 용량은 남았는데 파일이 안 만들어져요. inode가 찬 것 같아요

```text
종류: manual
1. `df -i`로 inode 사용률을 확인합니다.
2. [주의] inode가 가득 찬 경우, 작은 파일이 많은 폴더를 찾아 정리합니다.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 3. 시스템 로그에 Out of memory: Killed process 가 보이고 서비스가 죽었습니다

```text
종류: manual
1. [주의] `journalctl -k | grep -i "out of memory"`로 강제 종료된 프로세스와 시각을 확인합니다.
2. `free -h`로 현재 메모리와 스왑 사용량을 확인합니다. 메모리 판단은 `free`가 아니라 `available` 값을 기준으로 합니다.
3. `ps aux --sort=-%mem | head`로 메모리를 많이 쓰는 프로세스를 찾습니다.
4. [주의] `systemctl status <서비스>`로 서비스가 다시 떠 있는지 확인합니다. 떠 있지 않으면 `systemctl restart <서비스>`로 재시작합니다.
5. [주의] 같은 프로세스가 반복해서 종료되면 임의로 메모리 한도를 바꾸지 말고 서비스 담당자에게 사용량 증가 원인을 확인합니다.
근거: 메모리 부족(OOM) 대응 매뉴얼 (2026-08-20)
```

### 4. 시스템 로그에 eth0 Link is Down이 계속 찍혀요

```text
종류: manual
1. `ip -br link`으로 네트워크 인터페이스가 `UP` 상태인지 확인합니다.
2. `ip -br addr`로 주소가 할당되어 있는지, `ip route`로 기본 경로가 있는지 확인합니다.
3. 기본 경로의 게이트웨이로 `ping -c 4 <게이트웨이>`를 실행해 내부 통신을 확인합니다.
4. `journalctl -k | grep -i "link is"`로 링크가 끊겼다 붙기를 반복하는지 확인합니다. 반복되면 케이블과 스위치 포트 점검을 요청합니다.
5. [주의] 인터페이스가 내려가 있으면 `ip link set <인터페이스> up`으로 올립니다. 그래도 복구되지 않으면 선임에게 문의합니다.
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
1. `kubectl describe pods <파드 이름>`으로 시작하지 못한 원인을 확인합니다.
2. 이미지 이름이 맞는지 확인합니다.
3. 이미지가 레지스트리에 올라가 있는지 확인합니다.
4. `docker pull <이미지>`처럼 직접 받아 보며 확인합니다.
근거: Kubernetes 파드 장애 확인 안내 (2026-08-24)
```

### 7. docker 명령을 치면 Cannot connect to the Docker daemon 이라고 나와요

```text
종류: manual
1. `docker info` 또는 `sudo systemctl is-active docker`로 Docker 데몬이 실행 중인지 확인하세요.
2. `ps aux | grep dockerd`로 데몬 프로세스를 확인하세요.
3. [주의] `env | grep DOCKER_HOST`로 클라이언트가 원격 호스트를 가리키는지 확인하세요. 값이 잘못 설정되어 있으면 `unset DOCKER_HOST`를 실행하세요.
4. 원격 호스트를 사용 중이라면 호스트가 켜져 있는지, 방화벽에 막히지 않았는지 확인하세요.
근거: Docker 데몬 문제 해결 안내 (2026-11-02)
```

### 8. 커널 로그에 NVRM: Xid 메시지가 보이는데 어떻게 확인하나요

```text
종류: manual
1. `grep "NVRM: Xid" /var/log/syslog`로 Xid 기록을 찾습니다. 배포판에 따라 `/var/log/messages` 또는 `/var/log`의 저널을 확인합니다.
2. `nvidia-smi -q`로 GPU 상태를 확인합니다. Xid 48처럼 ECC 관련 오류라면 ECC 오류 수도 함께 확인합니다.
3. DCGM 진단으로 ECC, PCIe, 대역폭 상태를 점검합니다.
4. 드라이버나 하드웨어 문제가 의심되면 `sudo nvidia-bug-report.sh`로 보고서를 만듭니다.
근거: NVIDIA GPU Xid 오류 확인 안내 (2026-09-09)
```

### 9. PostgreSQL에서 FATAL: too many connections for role 에러가 납니다

```text
종류: web
1. 해당 역할의 연결 제한을 확인하세요: `SELECT rolconnlimit FROM pg_roles WHERE rolname = '역할명';`
2. [주의] 필요한 경우 역할의 연결 제한을 적절한 값으로 높이세요: `ALTER ROLE 역할명 CONNECTION LIMIT 새_제한값;` 서버 자원이 감당할 수 있는지 먼저 확인하세요.
출처: https://doc.rockdata.net/errors/too_many_connections/
```

### 10. Tomcat에서 java.lang.OutOfMemoryError: Metaspace 가 발생합니다

```text
종류: web
1. [주의] Tomcat이 Java 8 이상을 사용 중이라면, Tomcat의 JVM 시작 옵션(`JAVA_OPTS`)에 `-XX:MetaspaceSize=256M`와 `-XX:MaxMetaspaceSize=512M`를 추가해 Metaspace 할당량을 늘립니다. 수치는 예시이므로 실제 메모리 여유와 사용량에 맞춰 조정하세요.
2. [주의] 이미 `-XX:MaxMetaspaceSize`가 설정되어 있다면 그 값을 늘리세요. Metaspace는 네이티브 메모리를 사용하며, JVM 프로세스의 메모리 여유가 부족하면 힙 크기를 줄여 Metaspace에 공간을 확보하는 방법도 있습니다.
출처: https://www.alibabacloud.com/help/en/arms/application-monitoring/support/what-should-i-do-about-the-application-startup-outofmemoryerror-error
출처: https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/memleaks002.html
```

### 11. Windows Server 이벤트 로그에 Kernel-Power 41이 남고 재부팅됩니다

```text
종류: web
1. [주의] 이벤트 ID 41은 서버가 정상 종료 절차 없이 다시 시작됐다는 기록일 뿐, 원인을 단독으로 특정하지는 않습니다. 먼저 이벤트 뷰어의 Windows 로그 > 시스템에서 재부팅 시각 전후의 이벤트 ID 1001, 6008, 1074, 19, 7045를 함께 확인하세요.
2. [주의] 이벤트 ID 1001에 버그 검사 코드와 덤프 경로가 있으면 중지 오류(버그 체크)가 재부팅 원인일 수 있습니다. 해당 코드와 덤프를 확인하고, 장애 직전에 설치·업데이트된 드라이버, 애플리케이션 또는 Windows 업데이트가 있는지 이벤트 기록과 대조하세요.
3. [주의] 이벤트 ID 1074가 있으면 재시작을 요청한 프로세스·사용자·이유를 확인하세요. 1074 없이 41과 6008이 나타나면 예기치 않은 종료로 보고, 41의 BugcheckCode가 0이거나 비어 있는지도 확인하세요.
4. [주의] BugcheckCode가 0이면 전원 공급 중단·불안정 또는 기록이 디스크에 저장되기 전의 종료 가능성을 점검하세요. 원인이 분명하지 않으면 Microsoft 안내에 따라 시스템을 기본 구성으로 되돌려 문제가 계속되는지 확인하세요.
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
1. 클러스터 상태와 미할당 샤드를 확인합니다: `GET _cluster/health?filter_path=status,*_shards` 및 `GET _cat/shards?v=true&h=index,shard,prirep,state,node,unassigned.reason&s=state`를 실행합니다. `prirep`가 `p`면 기본 샤드, `r`면 복제본입니다.
2. 미할당 사유를 확인합니다: `GET _cluster/allocation/explain`을 실행합니다. 응답의 `allocate_explanation`과 노드별 `deciders`를 보고 할당을 막는 이유를 특정합니다.
3. [주의] 결과에 따라 원인을 해결합니다. 노드가 빠졌다면 노드 장애·네트워크 문제를 복구하고, 디스크 부족이면 공간을 확보하거나 노드 용량을 늘립니다. 할당 필터·인식 설정 문제라면 `GET my-index/_settings?flat_settings=true&include_defaults=true`와 `GET _cluster/settings?flat_settings=true&include_defaults=true`로 확인한 뒤 필요한 설정을 수정합니다.
4. [주의] 할당이 비활성화된 상태인지 확인합니다: `GET _cluster/settings?include_defaults=true&filter_path=*.cluster.routing.allocation.enable`. 비활성화가 확인되면 기본값으로 되돌려 할당을 다시 켭니다: `PUT _cluster/settings` 본문 `{"persistent":{"cluster.routing.allocation.enable":null}}`.
5. [주의] `no_valid_shard_copy`가 나오면 먼저 해당 데이터가 있는 노드의 복귀를 확인하고, 가능하면 스냅샷에서 복원합니다. 빈 기본 샤드 할당은 데이터 손실을 확정하는 조치이므로 노드 복구가 불가능한 경우에만 고려하세요.
출처: https://www.elastic.co/docs/troubleshoot/elasticsearch/red-yellow-cluster-status
출처: https://www.elastic.co/docs/troubleshoot/elasticsearch/diagnose-unassigned-shards
```

### 14. 서버가 좀 이상한 것 같아요

```text
후속 입력: 디스크가 가득 찼다고 No space left on device가 나와요
종류: manual
1. `df -h`로 가득 찬 파일시스템을 확인하세요. 용량에 여유가 있으면 `df -i`로 inode 사용률도 확인하세요.
2. `du -xh --max-depth=1 <마운트 경로> | sort -h`로 용량을 많이 쓰는 폴더를 찾으세요.
3. [주의] 지워도 되는 대상을 고르세요. `/var/log` 아래의 압축된 지난 로그와 작업이 끝난 임시 파일이 우선 대상입니다. 데이터 파일과 현재 쓰고 있는 로그는 삭제하지 마세요.
4. [주의] 선택한 대상을 삭제하세요.
5. `df -h`로 사용률이 80% 아래로 내려갔는지 확인하세요. 내려가지 않으면 선임에게 문의하세요.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 15. 에러가 나요

```text
후속 입력: nginx에서 502 Bad Gateway가 나요
종류: manual
1. `systemctl status nginx`와 `systemctl status <백엔드 서비스>`로 두 서비스의 상태를 확인합니다.
2. `tail -n 50 /var/log/nginx/error.log`로 에러 내용을 확인합니다. `connect() failed`나 `upstream timed out`이 있으면 백엔드 문제입니다.
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
  5. 냉각 점검을 요청하고, 점검이 끝나면 서버를 켠 뒤 온도를 다시 확인합니다.
문서: 서버실 온도 경보 조치 지침 (2026-03-22)
  1. `ipmitool sdr type temperature`로 서버 온도를 확인합니다.
  2. 온도가 90도 미만이면 `ipmitool sdr type fan`으로 팬 상태를 확인하고 10분 동안 지켜봅니다.
  3. [주의] 온도가 90도 이상이면 작업을 옮기지 말고 즉시 `shutdown -h now`로 서버를 종료합니다.
  4. 시설 담당자에게 냉방 점검을 요청합니다.
  5. 온도가 정상으로 돌아오면 서버를 켜고 작업을 다시 시작합니다.
```

### 18. /proc/mdstat에 [U_]가 보이고 디스크 하나가 빠진 것 같습니다

```text
종류: manual
1. `cat /proc/mdstat`로 성능 저하 상태인 RAID 장치를 확인합니다.
2. `mdadm --detail /dev/md0`로 장애 디스크를 확인합니다. `md0`은 확인한 장치 이름으로 바꿉니다.
3. 디스크를 교체하기 전에 백업 상태를 확인합니다.
4. [주의] `mdadm /dev/md0 --fail <디스크> --remove <디스크>`로 장애 디스크를 RAID에서 제거합니다.
5. [주의] 디스크를 교체한 뒤 `mdadm /dev/md0 --add <새 디스크>`로 추가하고, `cat /proc/mdstat`로 재구성 진행률을 확인합니다.
근거: RAID 디스크 장애 대응 매뉴얼 (2025-02-18) 오래된 문서
```

### 19. 디스크가 꽉 찼는데 로그를 어떻게 정리하면 되나요

```text
종류: manual
1. `df -h`로 용량이 부족한 파일시스템을 확인합니다.
2. `du -xh --max-depth=1 <마운트 경로> | sort -h`로 용량을 많이 쓰는 폴더를 찾습니다.
3. [주의] `/var/log` 아래의 압축된 지난 로그처럼 지워도 되는 대상을 고릅니다. 데이터 파일과 현재 쓰고 있는 로그는 삭제하지 않습니다.
4. [주의] 선택한 지난 로그를 삭제합니다. 현재 쓰고 있는 로그를 비워야 한다면 삭제하지 말고 `truncate -s 0 <파일>`을 사용합니다.
5. `df -h`로 사용률이 80% 아래로 내려갔는지 확인합니다. 내려가지 않으면 선임에게 문의합니다.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 20. 백엔드가 죽어서 502가 납니다. 서비스를 어떻게 살리나요

```text
종류: manual
1. `systemctl status <백엔드 서비스>`로 백엔드 상태를 확인합니다.
2. [주의] `journalctl -u <백엔드 서비스> -n 100`으로 중지 원인을 확인합니다.
3. [주의] 백엔드가 멈춰 있으면 `systemctl restart <백엔드 서비스>`를 실행합니다.
4. `curl -I http://localhost/`로 응답이 복구됐는지 확인합니다. 복구되지 않으면 선임에게 문의합니다.
근거: 웹 서비스 응답 없음 대응 매뉴얼 (2026-05-27)
```
