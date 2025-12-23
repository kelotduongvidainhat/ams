#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🔌 Testing WebSocket Connection...');
console.log('Connecting to: ws://localhost:3000/ws\n');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', function open() {
    console.log('✅ WebSocket connection established!');
    console.log('⏳ Waiting for events...\n');

    // Keep connection open for 5 seconds to receive any events
    setTimeout(() => {
        console.log('\n✅ WebSocket test completed successfully');
        ws.close();
        process.exit(0);
    }, 5000);
});

ws.on('message', function message(data) {
    console.log('📨 Received message:', data.toString());
    try {
        const parsed = JSON.parse(data.toString());
        console.log('   Event Type:', parsed.type);
        console.log('   Data:', JSON.stringify(parsed.data, null, 2));
    } catch (e) {
        // Not JSON, just display raw
    }
});

ws.on('error', function error(err) {
    console.error('❌ WebSocket error:', err.message);
    process.exit(1);
});

ws.on('close', function close() {
    console.log('🔌 WebSocket connection closed');
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('⏱️  Test timeout reached');
    ws.close();
    process.exit(0);
}, 10000);
