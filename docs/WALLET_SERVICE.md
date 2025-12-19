# Wallet-as-a-Service (WaaS) Implementation Guide

## 🎯 Overview

**Wallet-as-a-Service (WaaS)** enables users to create their Blockchain Identities directly through the Web Application, removing the need for manual administrator intervention (CLI Scripts). 

This transforms the application from a "Demo/POC" where users are pre-generated, into a **real-world platform** where any user can sign up and transact immediately.

## 🏗️ Architecture

The WaaS pipeline involves the following components:

1.  **Fabric CA Server**: The Certificate Authority responsible for issuing identities.
2.  **Fabric CA Client**: A binary tool running inside the Backend to communicate with the CA Server.
3.  **Backend API**: Exposes endpoints (`/api/wallet/register`) to the frontend.
4.  **Wallet Manager**: A file-system based storage (or potentially DB-based) to manage user Certificates (X.509) and Private Keys.

### Workflow

1.  **User Request**: User submits `username` and `password` via Frontend.
2.  **API Handler**: Backend receives request at `POST /api/wallet/register`.
3.  **Enrollment (Off-chain)**: 
    *   Backend invokes `fabric-ca-client register` (using Admin credentials).
    *   Backend invokes `fabric-ca-client enroll` to generate the crypto material.
4.  **Wallet Storage**: Certificates and Keys are saved to the persistent volume (e.g., `network/organizations/peerOrganizations/...`).
5.  **Ledger Update (On-chain)**: Backend automatically submits a transaction to the Ledger to assume the new identity's presence (e.g., `CreateUser` transaction).

## 🛠️ Implementation Requirements

To enable WaaS in your project, follow these necessary steps:

### 1. Docker Container Configuration

The Backend service MUST running in an environment that supports executing shell commands and the Fabric CA Client.

*   **Diff**: Update `backend/Dockerfile`.
*   **Base Image**: Switch from `scratch` or minimal images to `debian:bullseye-slim` or `alpine` (with `bash` installed).
*   **Dependencies**:
    *   `wget` / `curl`: To download the binary.
    *   `fabric-ca-client`: Downloaded from Hyperledger repository.
    *   `bash` or `sh`: To execute enrollment scripts.

```dockerfile
# Example Snippet
FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y wget curl
# Install fabric-ca-client...
```

### 2. Environment Variables

Update `docker-compose-app.yaml` to provide necessary context to the CA Client:

*   `CA_HOST`: Hostname of the CA (e.g., `ca_org1:7054`).
*   `CA_TLS_CERT`: Path to the CA's TLS Certificate (Required for HTTPS/TLS communication).
    *   *Note*: Ensure this file is mounted into the container.
*   `CRYPTO_PATH`: The root directory where user wallets should be generated.

### 3. Backend Logic (Golang)

*   **CA Wrapper (`ca.go`)**: Create a wrapper struct/function to securely execute `exec.Command` calls to `fabric-ca-client`.
    *   *Tip*: Use an embedded shell script for complex register/enroll logic.
*   **Wallet Middleware (`client.go`)**: Ensure the Fabric Gateway connection can switch identities dynamically based on the incoming request (e.g., `GetContractForUser(username)`).

## ⚠️ Security Considerations

*   **Admin Credentials**: The Backend currently needs "Admin" credentials to register new users. In Production, these should be injected securely (Secrets Manager), not hardcoded.
*   **Key Storage**: The current implementation stores Private Keys on the container's disk (Volume). For High Security, integrate with a **Hardware Security Module (HSM)** or Vault.
*   **TLS**: Always use TLS for CA communication to prevent credential interception.
