---
name: Kubernetes 파드 장애 확인 안내
date: 2026-08-24
source: https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/
---
Kubernetes 공식 문서(CC BY 4.0, The Kubernetes Authors)의 내용을 실습용으로 요약하고 한국어로 다시 쓴 문서다. 정확한 내용은 원문을 확인한다.

## 공통 확인

`kubectl describe pods <파드 이름>`을 실행해 컨테이너 상태, 최근 재시작 여부, Events 항목의 메시지를 확인한다.

## 파드가 Pending 상태일 때

노드에 배치되지 못한 상태이며, 자원 부족이나 `hostPort` 제약이 주된 원인이다.

1. `kubectl describe pods <파드 이름>`의 Events에서 스케줄러 메시지를 확인한다.
2. 자원이 부족하면 필요 없는 파드를 삭제하거나, 파드의 자원 요청량을 조정하거나, 노드를 추가한다.
3. `hostPort` 때문이면 Service로 대체하는 방법을 검토한다. `hostPort`를 쓰면 배치 가능한 파드 수가 노드 수로 제한된다.

## 파드가 Waiting 상태일 때

노드에 배치되었지만 시작하지 못한 상태이며, 이미지를 받지 못하는 경우가 가장 흔하다.

1. `kubectl describe pods <파드 이름>`으로 원인을 확인한다.
2. 이미지 이름이 맞는지 확인한다.
3. 이미지가 레지스트리에 올라가 있는지 확인한다.
4. `docker pull <이미지>`처럼 직접 받아 보며 확인한다.

## 파드가 반복해서 죽을 때

1. `kubectl describe pods <파드 이름>`으로 재시작 횟수와 상태를 확인한다.
2. `kubectl logs <파드 이름> <컨테이너 이름>`으로 현재 로그를 확인한다.
3. `kubectl logs --previous <파드 이름> <컨테이너 이름>`으로 직전에 죽은 컨테이너의 로그를 확인한다.
4. 로그에 나온 원인에 따라 설정이나 애플리케이션을 고친다.

## 파드는 실행 중인데 동작이 이상할 때

1. `kubectl apply --validate -f <파일>`로 설정 파일의 필드 이름 오타를 확인한다.
2. `kubectl get pods/<파드 이름> -o yaml`의 결과와 원본 설정 파일을 비교한다.

## 파드가 Terminating에서 멈췄을 때

파드를 수정하는 요청을 막는 승인 웹훅(admission webhook)이 있는지 확인한다.
