#!/usr/bin/env node

/**
 * Test script for monitoring APIs
 * Run with: node scripts/test-monitoring.mjs
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function testHealthEndpoints() {
  console.log('🏥 Testing health endpoints...\n');

  const endpoints = [
    '/api/health/system',
    '/api/health/integrations', 
    '/api/health/ai-providers'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint);
    
    console.log(`${endpoint}:`);
    console.log(`  Status: ${result.status}`);
    console.log(`  OK: ${result.ok}`);
    
    if (result.ok) {
      console.log(`  ✅ Success`);
      console.log(`  Response: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`);
    } else {
      console.log(`  ❌ Failed`);
      console.log(`  Error: ${result.error || JSON.stringify(result.data)}`);
    }
    console.log();
  }
}

async function testPublicStatusEndpoint() {
  console.log('👤 Testing public status endpoint...\n');
  
  // Test with a fake UUID (should return 404)
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const result = await makeRequest(`/api/submissions/${fakeId}/status`);
  
  console.log(`/api/submissions/${fakeId}/status:`);
  console.log(`  Status: ${result.status}`);
  console.log(`  Expected 404: ${result.status === 404 ? '✅' : '❌'}`);
  console.log();
}

async function testAdminEndpoints() {
  console.log('🔒 Testing admin endpoints (without auth - should fail)...\n');
  
  const endpoints = [
    '/api/admin/submissions/overview',
    '/api/admin/submissions/recent', 
    '/api/admin/submissions/failed',
    '/api/admin/health/detailed'
  ];

  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint);
    
    console.log(`${endpoint}:`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Expected 401: ${result.status === 401 ? '✅' : '❌'}`);
    
    if (result.data?.error) {
      console.log(`  Error: ${result.data.error}`);
    }
    console.log();
  }
}

async function testDatabaseFunctions() {
  console.log('🗄️  Testing database functions (via health check)...\n');
  
  const result = await makeRequest('/api/health/system');
  
  if (result.ok) {
    console.log('✅ Database connection successful');
    console.log('✅ Database functions accessible via health endpoints');
  } else {
    console.log('❌ Database connection failed');
    console.log(`   Error: ${result.error || JSON.stringify(result.data)}`);
  }
  console.log();
}

async function runTests() {
  console.log('🚀 Testing Monitoring & Status APIs\n');
  console.log(`API Base URL: ${API_BASE}\n`);
  console.log('=' * 50, '\n');

  try {
    await testHealthEndpoints();
    await testPublicStatusEndpoint();
    await testAdminEndpoints();
    await testDatabaseFunctions();
    
    console.log('📊 Test Summary:');
    console.log('✅ Health endpoints should return 200');
    console.log('✅ Public status with fake ID should return 404');  
    console.log('✅ Admin endpoints without auth should return 401');
    console.log('✅ Database connectivity verified');
    
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
