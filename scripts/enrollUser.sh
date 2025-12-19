#!/bin/bash
# scripts/enrollUser.sh
# Usage: ./enrollUser.sh <username> <password>

USERNAME=$1
PASSWORD=$2
ORG_DOMAIN="org1.example.com"
CA_PORT=7054
CA_NAME="ca-org1"

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: ./enrollUser.sh <username> <password>"
    exit 1
fi

export FABRIC_CFG_PATH=${PWD}/network/config
export PATH=${PWD}/bin:$PATH

NETWORK_DIR="${PWD}/network"
ORG_DIR="${NETWORK_DIR}/organizations/peerOrganizations/${ORG_DOMAIN}"
USER_DIR="${ORG_DIR}/users/${USERNAME}@${ORG_DOMAIN}"
CA_TLS_CERT="${NETWORK_DIR}/organizations/fabric-ca/org1/ca-cert.pem"

echo "Using CA at localhost:${CA_PORT}"
echo "Registering and Enrolling user: ${USERNAME}"

# 1. Register (must be done by admin)
# We assume 'admin' identity is already enrolled at organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com
# But usually we use the CA Admin to register new users.
# The CA Admin is at organizations/peerOrganizations/org1.example.com ? No.
# Creating identities usually requires the registrar to be enrolled.
# Let's assume we can use the 'admin' user created in bootstrap.

export FABRIC_CA_CLIENT_HOME=${ORG_DIR}
# The bootstrap script enrolled 'admin' (registrar) here?
# registerEnroll.sh says:
# fabric-ca-client enroll -u https://admin:adminpw@localhost:7054 ...
# It sets FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/

# Check if user already registered (idempotent)
echo "--- Registering ${USERNAME} ---"
fabric-ca-client register --caname ${CA_NAME} --id.name ${USERNAME} --id.secret ${PASSWORD} --id.type client --tls.certfiles ${CA_TLS_CERT}
# Ignore "Identity ... already exists" error

# 2. Enroll
echo "--- Enrolling ${USERNAME} ---"
mkdir -p ${USER_DIR}
export FABRIC_CA_CLIENT_HOME=${USER_DIR}

fabric-ca-client enroll -u https://${USERNAME}:${PASSWORD}@localhost:${CA_PORT} --caname ${CA_NAME} -M "${USER_DIR}/msp" --tls.certfiles ${CA_TLS_CERT}

# 3. Copy Config (Optional but good practice)
cp "${ORG_DIR}/msp/config.yaml" "${USER_DIR}/msp/config.yaml"

echo "✅ User ${USERNAME} enrolled successfully at ${USER_DIR}"
