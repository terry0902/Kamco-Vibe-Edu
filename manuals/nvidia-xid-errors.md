---
name: NVIDIA GPU Xid 오류 확인 안내
date: 2026-09-09
source: https://docs.nvidia.com/deploy/xid-errors/working-with-xid-errors.html
---
NVIDIA 공식 문서의 내용을 실습용으로 요약하고 한국어로 다시 쓴 문서다. 정확한 내용은 원문을 확인한다.

## Xid 오류란

GPU 문제를 진단하기 위해 NVIDIA 드라이버가 남기는 메시지다. Linux에서는 커널 로그에 기록되며, 배포판에 따라 저널이나 `/var/log/messages`, `/var/log/syslog`에도 남는다. 각 줄에는 GPU의 PCI 주소, Xid 번호, 오류별 추가 정보가 있다.

## 확인 순서

1. `grep "NVRM: Xid" /var/log/syslog`로 Xid 기록을 찾는다. 배포판에 따라 `/var/log/messages`를 확인한다.
2. `nvidia-smi -q`로 GPU 상태를 확인한다. Xid 48처럼 ECC 관련 오류면 ECC 오류 수를 함께 확인한다.
3. DCGM 진단으로 ECC, PCIe, 대역폭 상태를 점검한다.
4. 원인 분류에 따라 아래 조치를 진행한다.
5. 드라이버나 하드웨어 문제가 의심되면 `sudo nvidia-bug-report.sh`로 보고서를 만든다.

## 원인 분류별 조치

| 의심되는 원인 | 조치 |
|---|---|
| 사용자 프로그램 문제 | 디버거 도구(Compute Sanitizer의 memcheck, CUDA-GDB)로 프로그램을 확인한다. |
| 하드웨어 문제 | 하드웨어 공급사에 연락해 진단을 받는다. |
| 드라이버 문제 | `nvidia-bug-report.sh` 결과를 첨부해 NVIDIA에 버그를 신고한다. |

## 참고

- `nvidia-bug-report.sh`는 최대 1시간까지 걸릴 수 있다. 멈추면 `sudo nvidia-bug-report.sh --safe-mode --extra-system-data`를 실행한다. 결과 파일은 `nvidia-bug-report.log.gz`다.
- Xid 번호별 상세 내용은 원문의 Xid 카탈로그에서 확인한다.
