package fabric

import (

	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/hyperledger/fabric-gateway/pkg/identity"
)

// WalletManager handles loading user identities from the file system
type WalletManager struct {
	BaseCryptoPath string
	MspID          string
	OrgDomain      string
}

// NewWalletManager creates a new instance
func NewWalletManager() *WalletManager {
	return &WalletManager{
		BaseCryptoPath: getEnv("CRYPTO_PATH", "/home/sleep/ams/network/organizations/peerOrganizations/org1.example.com"),
		MspID:          "Org1MSP",
		OrgDomain:      "org1.example.com",
	}
}

// GetUserIdentity loads the X.509 identity and Sign function for a given user
func (w *WalletManager) GetUserIdentity(username string) (*identity.X509Identity, identity.Sign, error) {
	// Construct path: /users/<username>@<org>/msp
	// Note: The folder naming convention depends on how enroll was called.
	// Standard network.sh style: User1@org1.example.com
	
	// Handle special cases or default mapping
	userDirName := fmt.Sprintf("%s@%s", username, w.OrgDomain)
	if strings.Contains(username, "@") {
		userDirName = username 
	}

	mspPath := filepath.Join(w.BaseCryptoPath, "users", userDirName, "msp")
	
	// Check if exists
	if _, err := os.Stat(mspPath); os.IsNotExist(err) {
		// Fallback for case-sensitivity or simple names if needed? 
		// For now, fail strictly.
		return nil, nil, fmt.Errorf("user wallet not found at %s. Did you register and enroll this user?", mspPath)
	}

	// Load Cert
	certFiles, err := filepath.Glob(filepath.Join(mspPath, "signcerts", "*.pem"))
	if err != nil || len(certFiles) == 0 {
		return nil, nil, fmt.Errorf("no certificate found for user %s", username)
	}
	certPath := certFiles[0]

	certificatePEM, err := os.ReadFile(certPath)
	if err != nil {
		return nil, nil, err
	}
	
	certificate, err := identity.CertificateFromPEM(certificatePEM)
	if err != nil {
		return nil, nil, err
	}

	id, err := identity.NewX509Identity(w.MspID, certificate)
	if err != nil {
		return nil, nil, err
	}

	// Load Key
	keyDir := filepath.Join(mspPath, "keystore")
	keyFiles, err := os.ReadDir(keyDir)
	if err != nil || len(keyFiles) == 0 {
		return nil, nil, fmt.Errorf("no private key found for user %s", username)
	}
	// Take the first file that looks like a key (usually look for _sk or just any file)
	keyPath := filepath.Join(keyDir, keyFiles[0].Name())
	
	privateKeyPEM, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, nil, err
	}

	privateKey, err := identity.PrivateKeyFromPEM(privateKeyPEM)
	if err != nil {
		return nil, nil, err
	}

	sign, err := identity.NewPrivateKeySign(privateKey)
	if err != nil {
		return nil, nil, err
	}

	return id, sign, nil
}
