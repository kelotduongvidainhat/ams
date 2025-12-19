package fabric

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type CAClient struct {
	CaHost      string
	CaTlsCert   string
	CryptoPath  string
	MspID       string
}

func NewCAClient() *CAClient {
	return &CAClient{
		CaHost:     os.Getenv("CA_HOST"),
		CaTlsCert:  os.Getenv("CA_TLS_CERT"),
		CryptoPath: os.Getenv("CRYPTO_PATH"), 
		MspID:      "Org1MSP",
	}
}

// RegisterAndEnroll registers a new user and enrolls them to generate crypto material
func (c *CAClient) RegisterAndEnroll(username, password string) error {
	log.Printf("🔹 Starting CA Registration for %s...", username)

	clientHome := "/tmp/fabric-ca-client"
	if err := os.MkdirAll(clientHome, 0755); err != nil {
		return fmt.Errorf("failed to create client home: %v", err)
	}

	// 1. Enroll Admin (Bootstrap)
	// We use the bootstrap admin credentials to get a token to register new users.
	log.Println("🔹 Enrolling Admin...")
	cmdEnrollAdmin := exec.Command("fabric-ca-client", "enroll",
		"-u", fmt.Sprintf("https://admin:adminpw@%s", c.CaHost),
		"--tls.certfiles", c.CaTlsCert,
		"--home", clientHome,
	)
	
	if output, err := cmdEnrollAdmin.CombinedOutput(); err != nil {
		log.Printf("⚠️ CA Admin Enroll Output (may be harmless if already enrolled): %s", string(output))
	}

	// 2. Register User
	// We register the user as type 'client'
	log.Println("🔹 Registering User...")
	cmdRegister := exec.Command("fabric-ca-client", "register",
		"--id.name", username,
		"--id.secret", password,
		"--id.type", "client",
		"--tls.certfiles", c.CaTlsCert,
		"--home", clientHome,
		"--mspdir", "msp", // Admin's MSP
	)
	
	output, err := cmdRegister.CombinedOutput()
	if err != nil {
		outStr := string(output)
		// Check if already registered
		if strings.Contains(outStr, "already registered") {
			log.Printf("User %s already registered, proceeding to enroll", username)
		} else {
			return fmt.Errorf("failed to register user: %v, output: %s", err, outStr)
		}
	}

	// 3. Enroll User
	// The target directory is the specific user's MSP folder in the crypto config
	userMspDir := filepath.Join(c.CryptoPath, "users", fmt.Sprintf("%s@org1.example.com", username), "msp")
	
	// Create parent dir
	if err := os.MkdirAll(userMspDir, 0755); err != nil {
		return fmt.Errorf("failed to create user msp dir: %v", err)
	}
	
	log.Println("🔹 Enrolling User...")
	cmdEnrollUser := exec.Command("fabric-ca-client", "enroll",
		"-u", fmt.Sprintf("https://%s:%s@%s", username, password, c.CaHost),
		"--tls.certfiles", c.CaTlsCert,
		"--mspdir", userMspDir, // Output MSP directory
	)
	
	output, err = cmdEnrollUser.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to enroll user: %v, output: %s", err, string(output))
	}
	
	log.Println("✅ User successfully registered and enrolled!")
	return nil
}
