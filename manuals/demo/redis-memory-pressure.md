---
name: Redis 메모리 부족 대응 매뉴얼
date: 2026-10-05
---
실습용 가상 문서다.

## 적용 대상

애플리케이션에 `OOM command not allowed when used memory > 'maxmemory'` 오류가 나거나, Redis 메모리 사용률 경보가 85% 이상일 때 적용한다.

## 조치 순서

1. `redis-cli info memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"`로 사용량, 상한, 단편화 정도를 확인한다.
2. `redis-cli config get maxmemory-policy`로 메모리가 차면 어떻게 하는지 확인한다. `noeviction`이면 가득 찼을 때 쓰기가 거절된다.
3. `redis-cli --bigkeys`로 용량을 많이 쓰는 키를 찾는다. 서비스 영향이 있으니 사용량이 적은 시간에 한다.
4. 만료 시간(TTL) 없이 쌓이는 키가 원인이면 애플리케이션 담당자에게 TTL 설정을 요청한다. 급하면 임시 키를 `redis-cli unlink <키>`로 지운다.
5. `mem_fragmentation_ratio`가 1.5보다 크면 `redis-cli memory purge`로 쓰지 않는 메모리를 돌려준다.

## 참고

- `maxmemory`를 올리는 `config set`은 서버 물리 메모리 여유를 확인한 뒤에만 한다. 재시작하면 사라지므로 설정 파일에도 반영해야 한다.
- 키를 지우기 전에 어떤 서비스가 쓰는 키인지 확인한다. 세션이나 큐 키를 지우면 사용자 로그아웃이나 작업 유실이 생긴다.
- `FLUSHALL`과 `FLUSHDB`는 모든 데이터를 지우므로 사용하지 않는다.
