---
name: TLS 인증서 만료 대응 매뉴얼
date: 2026-07-02
---
실습용 가상 문서다.

## 적용 대상

브라우저에 `NET::ERR_CERT_DATE_INVALID`가 나오거나, 인증서 만료 7일 전 경보가 왔을 때 적용한다.

## 조치 순서

1. `openssl x509 -enddate -noout -in <인증서 파일>`로 서버에 설치된 인증서의 만료일을 확인한다.
2. 실제로 서비스되는 인증서도 `openssl s_client -connect <호스트명>:443 -servername <호스트명> </dev/null | openssl x509 -noout -dates`로 확인한다. 파일은 갱신됐는데 서비스는 옛 인증서를 쓰는 경우가 많다.
3. `certbot renew --dry-run`으로 갱신이 가능한지 먼저 시험한다. 실패하면 `/var/log/letsencrypt/letsencrypt.log`에서 원인을 확인한다.
4. 시험이 통과하면 `certbot renew`로 인증서를 갱신한다.
5. `nginx -t`로 설정을 검사한 뒤 `systemctl reload nginx`로 새 인증서를 적용하고, 2번 명령으로 만료일이 바뀌었는지 확인한다.

## 참고

- `reload`는 접속을 끊지 않고 설정을 다시 읽는다. `restart`는 접속이 끊기므로 `reload`를 먼저 쓴다.
- 갱신 작업이 자동으로 돌지 않으면 `systemctl list-timers | grep certbot`으로 타이머가 살아 있는지 확인한다.
- 사설 인증서는 이 문서로 갱신할 수 없다. 인증서 발급 담당자에게 요청한다.
