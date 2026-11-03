---
name: 방화벽 포트 허용 설정 매뉴얼 (Windows Server)
date: 2026-11-03
---
실습용 가상 문서다. Windows Defender 방화벽(고급 보안이 포함된 Windows Defender 방화벽)을 기준으로 한다.

## 적용 대상

Windows Server에서 특정 포트로 외부 접속이 안 되거나, 포트를 새로 열거나 닫아야 할 때 적용한다. 서비스는 이미 해당 포트에서 실행 중이라는 전제다. 모든 PowerShell 명령은 관리자 권한으로 실행한다.

## 조치 순서

1. `Get-NetFirewallProfile | Select-Object Name, Enabled`로 도메인, 개인, 공용 프로필의 방화벽 상태를 확인한다. 서버가 어느 프로필을 쓰는지는 `Get-NetConnectionProfile`로 확인한다.
2. `Get-NetFirewallRule -Direction Inbound -Enabled True | Get-NetFirewallPortFilter | Where-Object LocalPort -eq <포트>`로 이미 열려 있는 규칙이 있는지 확인한다.
3. `New-NetFirewallRule -DisplayName "<규칙 이름>" -Direction Inbound -Protocol TCP -LocalPort <포트> -Action Allow -Profile Domain`으로 포트를 허용한다. 특정 대역만 허용하려면 `-RemoteAddress <허용할 대역>`을 덧붙인다.
4. `Get-NetFirewallRule -DisplayName "<규칙 이름>"`으로 규칙이 `Enabled: True`인지 확인한다.
5. 다른 서버에서 `Test-NetConnection -ComputerName <서버 주소> -Port <포트>`를 실행해 `TcpTestSucceeded : True`가 나오는지 확인한다.

## 참고

- 화면으로 설정하려면 `wf.msc`를 실행해 "인바운드 규칙"에서 "새 규칙"을 만든다. 같은 이름의 규칙이 이미 있는지 먼저 확인한다.
- 규칙을 지울 때는 `Remove-NetFirewallRule -DisplayName "<규칙 이름>"`을 쓴다. 지우기 전에 같은 이름의 규칙이 여러 개가 아닌지 확인한다.
- 규칙을 만들었는데 적용되지 않으면 그룹 정책이 방화벽 규칙을 덮어쓰고 있을 수 있다. `gpresult /r`로 적용된 정책을 확인하고 정책 담당자에게 알린다.
- 원격 데스크톱(포트 3389)과 원격 관리 규칙은 끄거나 지우지 않는다. 서버에 원격으로 접속할 수 없게 된다.
- 문제를 찾는 동안 `Set-NetFirewallProfile -Enabled False`로 방화벽을 끄는 방식은 쓰지 않는다. 서버가 그대로 노출된다.
