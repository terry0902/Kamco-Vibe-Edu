# 정답률 측정 결과

정답 20/20 (100%), 목표 90% 달성

자동 채점 결과이며, 사람이 아래 답변 전문을 함께 검토한다.

| 번호 | 유형 | 판정 | 답변 종류 | 시간 | 문제 |
|---|---|---|---|---:|---|
| 1 | 매뉴얼 안 | 정답 | manual | 4.1초 |  |
| 2 | 매뉴얼 안 | 정답 | manual | 5.3초 |  |
| 3 | 매뉴얼 안 | 정답 | manual | 4.2초 |  |
| 4 | 매뉴얼 안 | 정답 | manual | 3.2초 |  |
| 5 | 매뉴얼 안 | 정답 | manual | 3.3초 |  |
| 6 | 매뉴얼 안 | 정답 | manual | 2.6초 |  |
| 7 | 매뉴얼 안 | 정답 | manual | 4.0초 |  |
| 8 | 매뉴얼 안 | 정답 | manual | 3.7초 |  |
| 9 | 매뉴얼 밖 | 정답 | notFound | 8.8초 |  |
| 10 | 매뉴얼 밖 | 정답 | web | 11.2초 |  |
| 11 | 매뉴얼 밖 | 정답 | web | 13.2초 |  |
| 12 | 매뉴얼 밖 | 정답 | web | 8.7초 |  |
| 13 | 매뉴얼 밖 | 정답 | notFound | 8.7초 |  |
| 14 | 모호한 질문 | 정답 | manual | 5.8초 |  |
| 15 | 모호한 질문 | 정답 | manual | 6.1초 |  |
| 16 | 모호한 질문 | 정답 | escalate | 5.9초 |  |
| 17 | 문서 충돌·오래된 문서 | 정답 | conflict | 5.5초 |  |
| 18 | 문서 충돌·오래된 문서 | 정답 | manual | 4.7초 |  |
| 19 | 위험 조치 | 정답 | manual | 5.3초 |  |
| 20 | 위험 조치 | 정답 | manual | 2.9초 |  |

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
1. `df -i`로 inode 사용률이 실제로 가득 찼는지 확인하세요.
2. inode가 가득 찼다면 작은 파일이 많이 모여 있는 폴더를 찾아 정리 대상을 확인하세요.
3. [주의] 지워도 되는 파일만 삭제하세요. 데이터 파일과 현재 쓰고 있는 로그는 삭제하지 마세요.
4. `df -i`로 inode 사용률이 내려갔는지 확인하세요.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 3. 시스템 로그에 Out of memory: Killed process 가 보이고 서비스가 죽었습니다

```text
종류: manual
1. [주의] `journalctl -k | grep -i "out of memory"`로 강제 종료된 프로세스와 시각을 확인합니다.
2. `free -h`로 현재 메모리와 스왑 사용량을 확인합니다. `free`가 아니라 `available` 값을 기준으로 판단합니다.
3. `ps aux --sort=-%mem | head`로 메모리를 많이 쓰는 프로세스를 찾습니다.
4. [주의] 종료된 서비스가 다시 떠 있는지 `systemctl status <서비스>`로 확인합니다. 떠 있지 않으면 `systemctl restart <서비스>`로 재시작합니다.
5. [주의] 같은 프로세스가 반복해서 종료되면 임의로 메모리 한도를 바꾸지 말고 서비스 담당자에게 사용량 증가 원인을 확인합니다.
근거: 메모리 부족(OOM) 대응 매뉴얼 (2026-08-20)
```

### 4. 시스템 로그에 eth0 Link is Down이 계속 찍혀요

```text
종류: manual
1. `ip -br link`으로 네트워크 인터페이스가 `UP` 상태인지 확인합니다.
2. `ip -br addr`로 주소 할당을, `ip route`로 기본 경로를 확인합니다.
3. `journalctl -k | grep -i "link is"`로 링크가 끊겼다 붙기를 반복하는지 확인합니다. 반복되면 케이블과 스위치 포트 점검을 요청합니다.
4. 인터페이스가 내려가 있으면 `ip link set <인터페이스> up`으로 올립니다. 그래도 복구되지 않으면 선임에게 문의합니다.
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
1. `docker info` 또는 `sudo systemctl is-active docker`로 Docker 데몬이 실행 중인지 확인합니다.
2. `ps aux | grep dockerd`로 Docker 데몬 프로세스를 확인합니다.
3. [주의] `env | grep DOCKER_HOST`로 클라이언트가 원격 호스트를 가리키는지 확인합니다. 잘못 설정되어 있으면 `unset DOCKER_HOST`를 실행합니다.
4. 원격 호스트를 사용하는 경우 호스트가 켜져 있는지, 방화벽에 막히지 않았는지 확인합니다.
근거: Docker 데몬 문제 해결 안내 (2026-11-02)
```

### 8. 커널 로그에 NVRM: Xid 메시지가 보이는데 어떻게 확인하나요

```text
종류: manual
1. `grep "NVRM: Xid" /var/log/syslog`로 Xid 기록을 찾으세요. 배포판에 따라 `/var/log/messages`도 확인하세요.
2. `nvidia-smi -q`로 GPU 상태를 확인하세요. Xid 48처럼 ECC 관련 오류라면 ECC 오류 수도 확인하세요.
3. DCGM 진단으로 ECC, PCIe, 대역폭 상태를 점검하세요.
4. 원인 분류에 따라 사용자 프로그램 문제는 Compute Sanitizer의 memcheck 또는 CUDA-GDB로 확인하고, 하드웨어 문제가 의심되면 하드웨어 공급사에 진단을 요청하세요.
5. 드라이버나 하드웨어 문제가 의심되면 `sudo nvidia-bug-report.sh`로 보고서를 만드세요.
근거: NVIDIA GPU Xid 오류 확인 안내 (2026-09-09)
```

### 9. PostgreSQL에서 FATAL: too many connections for role 에러가 납니다

```text
종류: notFound
```

### 10. Tomcat에서 java.lang.OutOfMemoryError: Metaspace 가 발생합니다

```text
종류: web
1. JVM 시작 옵션에서 `-XX:MaxMetaspaceSize`가 설정되어 있는지 확인합니다. 이 값은 메타데이터 공간의 사용 상한이며, 상한을 넘으면 해당 오류가 발생할 수 있습니다.
2. [주의] Metaspace 상한에 도달한 경우 JVM 실행 옵션의 `-XX:MaxMetaspaceSize` 값을 늘려 설정합니다. 적용하려면 Tomcat JVM 시작 옵션을 변경해야 합니다. 적정값은 현재 설정과 서버 메모리 여유에 따라 정해야 합니다.
3. 재배포나 웹앱 리로드를 반복한 뒤 발생했다면, 웹앱의 ClassLoader가 해제된 후에도 클래스에 대한 강한 참조가 남아 메타데이터가 회수되지 않는 누수 가능성을 점검합니다.
출처: https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/memleaks002.html
출처: https://cwiki.apache.org/confluence/spaces/TOMCAT/pages/103099557/OutOfMemory
```

### 11. Windows Server 이벤트 로그에 Kernel-Power 41이 남고 재부팅됩니다

```text
종류: web
1. [주의] 이벤트 뷰어의 **Windows 로그 > 시스템**에서 재부팅 시각 전후의 이벤트 **13, 41, 1074, 6008, 1001, 19, 7045**를 확인하세요. 41과 6008은 비정상 종료를 나타내며, 1074는 프로세스나 사용자가 시작한 재부팅, 1001은 버그 체크(Stop error) 단서를 제공할 수 있습니다.
2. [주의] 이벤트 41의 **BugcheckCode**와 **BugcheckParameter**를 확인하세요. BugcheckCode가 0이 아니거나 이벤트 1001이 있으면, 1001에 기록된 중지 코드와 덤프 경로(예: `C:\Windows\MEMORY.DMP`)를 확인해 버그 체크 원인을 추적하세요.
3. [주의] 재부팅 전에 드라이버·애플리케이션·Windows 업데이트가 설치되었는지 이벤트 기록과 대조하세요. 문제가 시작된 시점 직전의 변경이 확인되면 해당 드라이버 업데이트를 롤백해 재현 여부를 확인하세요.
4. BugcheckCode가 0이거나 버그 체크 기록이 없으면 전원 공급 중단·불안정 여부를 확인하세요. Microsoft는 전원 공급 장치 문제 등이 가능한 원인이라고 안내합니다.
출처: https://learn.microsoft.com/en-us/troubleshoot/windows-server/performance/troubleshoot-unexpected-reboots-system-event-logs
출처: https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/event-id-41-restart
```

### 12. BGP 피어가 Idle 상태에서 올라오지 않습니다

```text
종류: web
1. Cisco IOS/IOS XE라면 `show ip bgp all summary`로 피어 상태를 확인하고, 해당 피어가 Idle인지 확인합니다.
2. `show ip bgp neighbors <피어 IP>`로 상세 상태와 마지막 리셋 사유를 확인합니다.
3. 피어 주소로 가는 경로와 설정을 양쪽에서 확인합니다. 이웃 IP, 원격 AS 번호, 필요한 `update-source` 설정이 맞는지 점검합니다.
4. [주의] 피어가 직접 연결되어 있지 않은 eBGP라면 `neighbor ebgp-multihop` 설정이 필요한지 확인합니다.
5. TCP 세션이 성립하지 않으면 `show tcp brief all`, `show control-plane host open-ports`, `debug ip tcp transactions`로 연결 문제를 분리해 확인합니다.
출처: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/218027-troubleshoot-border-gateway-protocol-bas.html
출처: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/220604-understand-basic-bgp-troubleshoot.html
출처: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13752-24.html
```

### 13. Elasticsearch 클러스터 상태가 red이고 샤드가 unassigned입니다

```text
종류: notFound
```

### 14. 서버가 좀 이상한 것 같아요

```text
후속 입력: 디스크가 가득 찼다고 No space left on device가 나와요
종류: manual
1. `df -h`로 가득 찬 파일시스템을 확인한다. 용량에 여유가 있으면 `df -i`로 inode 사용률도 확인한다.
2. `du -xh --max-depth=1 <마운트 경로> | sort -h`로 용량을 많이 쓰는 폴더를 찾는다.
3. [주의] 지워도 되는 대상을 고른다. `/var/log` 아래의 압축된 지난 로그, 작업이 끝난 임시 파일이 우선 대상이다.
4. [주의] 대상 파일을 삭제한다. 데이터 파일과 현재 쓰고 있는 로그는 삭제하지 않는다.
5. `df -h`로 사용률이 80% 아래로 내려갔는지 확인한다. 내려가지 않으면 선임에게 문의한다.
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
1. `cat /proc/mdstat`로 성능 저하 상태인 RAID 장치 이름을 확인합니다.
2. `mdadm --detail /dev/md0`로 장애 디스크를 확인합니다. `/dev/md0`은 확인한 장치 이름으로 바꿉니다.
3. 디스크를 교체하기 전에 백업 상태를 확인합니다.
4. [주의] `mdadm /dev/md0 --fail <디스크> --remove <디스크>`로 장애 디스크를 RAID에서 제거합니다. `md0`과 `<디스크>`는 확인한 장치 및 디스크 이름으로 바꿉니다.
5. [주의] 디스크를 교체한 뒤 `mdadm /dev/md0 --add <새 디스크>`로 추가하고, `cat /proc/mdstat`로 재구성 진행률을 확인합니다.
근거: RAID 디스크 장애 대응 매뉴얼 (2025-02-18) 오래된 문서
```

### 19. 디스크가 꽉 찼는데 로그를 어떻게 정리하면 되나요

```text
종류: manual
1. `df -h`로 가득 찬 파일시스템을 확인합니다. 용량에 여유가 있으면 `df -i`로 inode 사용률도 확인합니다.
2. `du -xh --max-depth=1 <마운트 경로> | sort -h`로 용량을 많이 쓰는 폴더를 찾습니다.
3. [주의] 삭제해도 되는 대상을 고릅니다. 우선 정리 대상은 `/var/log` 아래의 압축된 지난 로그와 작업이 끝난 임시 파일입니다. 데이터 파일과 현재 쓰고 있는 로그는 삭제하지 않습니다.
4. [주의] 선택한 대상 파일을 삭제합니다. 현재 쓰고 있는 로그를 비워야 한다면 삭제하지 말고 `truncate -s 0 <파일>`을 사용합니다.
5. `df -h`로 사용률이 80% 아래로 내려갔는지 확인합니다. 내려가지 않으면 선임에게 문의합니다.
근거: 디스크 용량 부족 대응 매뉴얼 (2026-09-14)
```

### 20. 백엔드가 죽어서 502가 납니다. 서비스를 어떻게 살리나요

```text
종류: manual
1. `systemctl status <백엔드 서비스>`로 백엔드 서비스 상태를 확인합니다.
2. [주의] `journalctl -u <백엔드 서비스> -n 100`으로 중지 원인을 확인합니다.
3. [주의] 백엔드가 멈춰 있으면 `systemctl restart <백엔드 서비스>`로 재시작합니다.
4. `curl -I http://localhost/`로 응답이 복구되었는지 확인합니다. 복구되지 않으면 선임에게 문의합니다.
근거: 웹 서비스 응답 없음 대응 매뉴얼 (2026-05-27)
```
