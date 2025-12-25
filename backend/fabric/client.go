package fabric

import (
	"crypto/x509"
	"fmt"
	"os"
	"time"

	"github.com/hyperledger/fabric-gateway/pkg/client"
	"github.com/hyperledger/fabric-gateway/pkg/identity"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

var (
	tlsCertPath  = getEnv("CRYPTO_PATH", "/home/sleep/ams/network/organizations/peerOrganizations/org1.example.com") + "/tlsca/tlsca.org1.example.com-cert.pem"
	peerEndpoint = getEnv("PEER_ENDPOINT", "localhost:7051")
	gatewayPeer  = getEnv("GATEWAY_PEER", "peer0.org1.example.com")
	channelName  = "mychannel"
	chaincodeName = "basic"
)

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

// Service manages the gRPC connection and wallet for creating per-user contracts
type Service struct {
	ClientConn *grpc.ClientConn
	Wallet     *WalletManager
}

// NewService initializes the shared gRPC connection and Wallet Manager
func NewService() (*Service, error) {
	// The gRPC client connection should be shared by all Gateway connections to this endpoint
	clientConnection := newGrpcConnection()
	wallet := NewWalletManager()

	return &Service{
		ClientConn: clientConnection,
		Wallet:     wallet,
	}, nil
}

// GetContractForUser creates a new Gateway connection for the specific user and returns the contract
func (s *Service) GetContractForUser(username string) (*client.Contract, error) {
	id, sign, err := s.Wallet.GetUserIdentity(username)
	if err != nil {
		return nil, fmt.Errorf("failed to load identity for user %s: %w", username, err)
	}

	// Create a Gateway connection for a specific client identity
	gw, err := client.Connect(
		id,
		client.WithSign(sign),
		client.WithClientConnection(s.ClientConn),
		// Default timeouts
		client.WithEvaluateTimeout(5*time.Second),
		client.WithEndorseTimeout(15*time.Second),
		client.WithSubmitTimeout(5*time.Second),
		client.WithCommitStatusTimeout(1*time.Minute),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to gateway as user %s: %w", username, err)
	}

	// Note: In a real high-throughput app, we might want to cache these Gateway instances
	// map[string]*client.Gateway
	
	network := gw.GetNetwork(channelName)
	contract := network.GetContract(chaincodeName)

	return contract, nil
}

// GetNetworkForUser creates a new Gateway connection for the specific user and returns the network
func (s *Service) GetNetworkForUser(username string) (*client.Network, error) {
	id, sign, err := s.Wallet.GetUserIdentity(username)
	if err != nil {
		return nil, fmt.Errorf("failed to load identity for user %s: %w", username, err)
	}

	gw, err := client.Connect(
		id,
		client.WithSign(sign),
		client.WithClientConnection(s.ClientConn),
		client.WithEvaluateTimeout(5*time.Second),
		client.WithEndorseTimeout(15*time.Second),
		client.WithSubmitTimeout(5*time.Second),
		client.WithCommitStatusTimeout(1*time.Minute),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to gateway as user %s: %w", username, err)
	}

	return gw.GetNetwork(channelName), nil
}

// newGrpcConnection creates a gRPC connection to the Gateway peer
func newGrpcConnection() *grpc.ClientConn {
	certificate, err := loadCertificate(tlsCertPath)
	if err != nil {
		panic(err)
	}

	certPool := x509.NewCertPool()
	certPool.AddCert(certificate)
	transportCredentials := credentials.NewClientTLSFromCert(certPool, gatewayPeer)

	connection, err := grpc.NewClient(peerEndpoint, grpc.WithTransportCredentials(transportCredentials))
	if err != nil {
		panic(fmt.Errorf("failed to create gRPC connection: %w", err))
	}

	return connection
}

func loadCertificate(filename string) (*x509.Certificate, error) {
	certificatePEM, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate file: %w", err)
	}
	return identity.CertificateFromPEM(certificatePEM)
}
