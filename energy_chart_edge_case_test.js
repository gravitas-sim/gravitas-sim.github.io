/**
 * Energy Chart Edge Case Test Suite
 * 
 * This script tests the energy chart system under various edge cases:
 * 1. Fast-forward mode responsiveness
 * 2. Rapid object switching
 * 3. Pause/resume functionality
 * 4. Memory management
 * 5. Chart responsiveness under load
 */

console.log('🔬 Starting Energy Chart Edge Case Tests...');

// Test configuration
const TEST_CONFIG = {
    fastForwardDuration: 5000, // 5 seconds of fast-forward
    rapidSwitchCount: 20,      // Number of rapid object switches
    pauseDuration: 2000,       // 2 seconds pause
    memoryCheckInterval: 1000, // Check memory every second
    maxMemoryMB: 100           // Maximum allowed memory usage
};

// Test state
let testResults = {
    fastForward: { passed: false, issues: [] },
    rapidSwitching: { passed: false, issues: [] },
    pauseResume: { passed: false, issues: [] },
    memoryManagement: { passed: false, issues: [] },
    responsiveness: { passed: false, issues: [] }
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logTest = (testName, message, isError = false) => {
    const prefix = isError ? '❌' : '✅';
    console.log(`${prefix} [${testName}] ${message}`);
};

const getRandomObject = () => {
    const allObjects = [
        ...(window.bh_list || []),
        ...(window.planets || []),
        ...(window.stars || []),
        ...(window.gas_giants || []),
        ...(window.asteroids || []),
        ...(window.comets || []),
        ...(window.neutron_stars || []),
        ...(window.white_dwarfs || [])
    ].filter(obj => obj && obj.alive !== false);
    
    return allObjects[Math.floor(Math.random() * allObjects.length)];
};

const checkChartResponsiveness = () => {
    const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
    const chart = document.getElementById('energyChart');
    const collectingMessage = document.querySelector('.collecting-message');
    
    return {
        tabExists: !!energyTab,
        chartExists: !!chart,
        collectingMessageVisible: collectingMessage && collectingMessage.style.display !== 'none',
        chartInitialized: window.chartInitialized || false
    };
};

const getMemoryStats = () => {
    if (window.getEnergySystemMemoryStats) {
        return window.getEnergySystemMemoryStats();
    }
    return null;
};

// Test 1: Fast-forward mode responsiveness
const testFastForwardMode = async () => {
    logTest('FastForward', 'Starting fast-forward mode test...');
    
    try {
        // Store original speed
        const originalSpeed = window.state?.simulation_speed || 1;
        
        // Set to maximum speed
        if (window.state) {
            window.state.simulation_speed = 10; // Maximum speed
        }
        
        // Select a random object and open inspector
        const testObject = getRandomObject();
        if (!testObject) {
            throw new Error('No objects available for testing');
        }
        
        // Open inspector
        if (window.showObjectInspector) {
            window.showObjectInspector(testObject, testObject.constructor.name);
        }
        
        // Switch to energy tab
        const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
        if (energyTab) {
            energyTab.click();
        }
        
        // Wait for chart to initialize
        await sleep(1000);
        
        // Monitor chart responsiveness during fast-forward
        let responsivenessChecks = 0;
        let responsiveChecks = 0;
        
        for (let i = 0; i < 10; i++) {
            await sleep(500);
            const chartState = checkChartResponsiveness();
            
            if (chartState.chartExists && chartState.tabExists) {
                responsiveChecks++;
            }
            responsivenessChecks++;
        }
        
        const responsivenessRate = responsiveChecks / responsivenessChecks;
        
        if (responsivenessRate >= 0.8) {
            testResults.fastForward.passed = true;
            logTest('FastForward', `Chart responsiveness: ${(responsivenessRate * 100).toFixed(1)}%`);
        } else {
            testResults.fastForward.issues.push(`Low responsiveness: ${(responsivenessRate * 100).toFixed(1)}%`);
        }
        
        // Restore original speed
        if (window.state) {
            window.state.simulation_speed = originalSpeed;
        }
        
    } catch (error) {
        testResults.fastForward.issues.push(`Error: ${error.message}`);
        logTest('FastForward', `Error: ${error.message}`, true);
    }
};

// Test 2: Rapid object switching
const testRapidObjectSwitching = async () => {
    logTest('RapidSwitching', 'Starting rapid object switching test...');
    
    try {
        const objects = [
            ...(window.bh_list || []),
            ...(window.planets || []),
            ...(window.stars || []),
            ...(window.gas_giants || [])
        ].filter(obj => obj && obj.alive !== false).slice(0, 10);
        
        if (objects.length < 2) {
            throw new Error('Not enough objects for rapid switching test');
        }
        
        let switchCount = 0;
        let successfulSwitches = 0;
        
        // Open inspector with first object
        if (window.showObjectInspector) {
            window.showObjectInspector(objects[0], objects[0].constructor.name);
        }
        
        // Switch to energy tab
        const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
        if (energyTab) {
            energyTab.click();
        }
        
        await sleep(500);
        
        // Rapidly switch between objects
        for (let i = 0; i < TEST_CONFIG.rapidSwitchCount; i++) {
            const object = objects[i % objects.length];
            
            if (window.showObjectInspector) {
                window.showObjectInspector(object, object.constructor.name);
            }
            
            switchCount++;
            
            // Check if chart cleared and new data appears
            await sleep(100);
            const chartState = checkChartResponsiveness();
            
            if (chartState.chartExists && !chartState.collectingMessageVisible) {
                successfulSwitches++;
            }
            
            await sleep(50); // Brief pause between switches
        }
        
        const successRate = successfulSwitches / switchCount;
        
        if (successRate >= 0.7) {
            testResults.rapidSwitching.passed = true;
            logTest('RapidSwitching', `Successful switches: ${successfulSwitches}/${switchCount} (${(successRate * 100).toFixed(1)}%)`);
        } else {
            testResults.rapidSwitching.issues.push(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
        }
        
    } catch (error) {
        testResults.rapidSwitching.issues.push(`Error: ${error.message}`);
        logTest('RapidSwitching', `Error: ${error.message}`, true);
    }
};

// Test 3: Pause and resume functionality
const testPauseResume = async () => {
    logTest('PauseResume', 'Starting pause/resume test...');
    
    try {
        // Select a test object
        const testObject = getRandomObject();
        if (!testObject) {
            throw new Error('No objects available for testing');
        }
        
        // Open inspector and energy tab
        if (window.showObjectInspector) {
            window.showObjectInspector(testObject, testObject.constructor.name);
        }
        
        const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
        if (energyTab) {
            energyTab.click();
        }
        
        await sleep(1000);
        
        // Get initial data
        const initialData = window.getObjectEnergyHistory ? 
            window.getObjectEnergyHistory(testObject.id) : [];
        
        // Pause simulation
        if (window.state) {
            window.state.paused = true;
        }
        
        logTest('PauseResume', 'Simulation paused');
        
        // Wait during pause
        await sleep(TEST_CONFIG.pauseDuration);
        
        // Check that no new data was added during pause
        const pausedData = window.getObjectEnergyHistory ? 
            window.getObjectEnergyHistory(testObject.id) : [];
        
        if (pausedData.length === initialData.length) {
            logTest('PauseResume', 'No new data added during pause ✓');
        } else {
            testResults.pauseResume.issues.push(`Data added during pause: ${pausedData.length - initialData.length} points`);
        }
        
        // Resume simulation
        if (window.state) {
            window.state.paused = false;
        }
        
        logTest('PauseResume', 'Simulation resumed');
        
        // Wait for new data
        await sleep(2000);
        
        // Check that new data is being added after resume
        const resumedData = window.getObjectEnergyHistory ? 
            window.getObjectEnergyHistory(testObject.id) : [];
        
        if (resumedData.length > pausedData.length) {
            testResults.pauseResume.passed = true;
            logTest('PauseResume', `New data after resume: ${resumedData.length - pausedData.length} points`);
        } else {
            testResults.pauseResume.issues.push('No new data after resume');
        }
        
    } catch (error) {
        testResults.pauseResume.issues.push(`Error: ${error.message}`);
        logTest('PauseResume', `Error: ${error.message}`, true);
    }
};

// Test 4: Memory management
const testMemoryManagement = async () => {
    logTest('MemoryManagement', 'Starting memory management test...');
    
    try {
        const initialStats = getMemoryStats();
        if (!initialStats) {
            throw new Error('Memory stats function not available');
        }
        
        logTest('MemoryManagement', `Initial memory: ${initialStats.totalMemoryEstimateMB.toFixed(2)}MB`);
        
        // Run simulation for a while to accumulate data
        const testObject = getRandomObject();
        if (testObject && window.showObjectInspector) {
            window.showObjectInspector(testObject, testObject.constructor.name);
        }
        
        // Monitor memory usage
        let maxMemory = initialStats.totalMemoryEstimateMB;
        let memoryChecks = 0;
        
        for (let i = 0; i < 10; i++) {
            await sleep(TEST_CONFIG.memoryCheckInterval);
            
            const currentStats = getMemoryStats();
            if (currentStats) {
                maxMemory = Math.max(maxMemory, currentStats.totalMemoryEstimateMB);
                memoryChecks++;
                
                logTest('MemoryManagement', `Memory check ${i + 1}: ${currentStats.totalMemoryEstimateMB.toFixed(2)}MB`);
            }
        }
        
        // Check if memory usage is reasonable
        if (maxMemory <= TEST_CONFIG.maxMemoryMB) {
            testResults.memoryManagement.passed = true;
            logTest('MemoryManagement', `Peak memory usage: ${maxMemory.toFixed(2)}MB (under ${TEST_CONFIG.maxMemoryMB}MB limit)`);
        } else {
            testResults.memoryManagement.issues.push(`High memory usage: ${maxMemory.toFixed(2)}MB`);
        }
        
        // Test manual memory trimming
        if (window.trimAllEnergyHistory) {
            const beforeTrim = getMemoryStats();
            window.trimAllEnergyHistory(1000); // Trim to 1000 points
            await sleep(500);
            const afterTrim = getMemoryStats();
            
            if (afterTrim.totalMemoryEstimateMB < beforeTrim.totalMemoryEstimateMB) {
                logTest('MemoryManagement', `Manual trim successful: ${beforeTrim.totalMemoryEstimateMB.toFixed(2)}MB → ${afterTrim.totalMemoryEstimateMB.toFixed(2)}MB`);
            } else {
                testResults.memoryManagement.issues.push('Manual trim did not reduce memory usage');
            }
        }
        
    } catch (error) {
        testResults.memoryManagement.issues.push(`Error: ${error.message}`);
        logTest('MemoryManagement', `Error: ${error.message}`, true);
    }
};

// Test 5: Overall responsiveness
const testOverallResponsiveness = async () => {
    logTest('Responsiveness', 'Starting overall responsiveness test...');
    
    try {
        let responsiveChecks = 0;
        let totalChecks = 0;
        
        // Test responsiveness under various conditions
        for (let i = 0; i < 20; i++) {
            const testObject = getRandomObject();
            if (testObject && window.showObjectInspector) {
                window.showObjectInspector(testObject, testObject.constructor.name);
            }
            
            await sleep(200);
            
            const chartState = checkChartResponsiveness();
            totalChecks++;
            
            if (chartState.chartExists && chartState.tabExists) {
                responsiveChecks++;
            }
            
            // Occasionally switch to energy tab
            if (i % 3 === 0) {
                const energyTab = document.querySelector('.inspector-tab[data-tab="energy"]');
                if (energyTab) {
                    energyTab.click();
                }
            }
        }
        
        const responsivenessRate = responsiveChecks / totalChecks;
        
        if (responsivenessRate >= 0.8) {
            testResults.responsiveness.passed = true;
            logTest('Responsiveness', `Overall responsiveness: ${(responsivenessRate * 100).toFixed(1)}%`);
        } else {
            testResults.responsiveness.issues.push(`Low responsiveness: ${(responsivenessRate * 100).toFixed(1)}%`);
        }
        
    } catch (error) {
        testResults.responsiveness.issues.push(`Error: ${error.message}`);
        logTest('Responsiveness', `Error: ${error.message}`, true);
    }
};

// Run all tests
const runAllTests = async () => {
    console.log('🚀 Starting comprehensive energy chart edge case tests...');
    console.log('⏱️  This will take approximately 30-60 seconds...');
    
    try {
        await testFastForwardMode();
        await sleep(1000);
        
        await testRapidObjectSwitching();
        await sleep(1000);
        
        await testPauseResume();
        await sleep(1000);
        
        await testMemoryManagement();
        await sleep(1000);
        
        await testOverallResponsiveness();
        
        // Generate test report
        generateTestReport();
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }
};

// Generate test report
const generateTestReport = () => {
    console.log('\n📊 ENERGY CHART EDGE CASE TEST REPORT');
    console.log('=====================================');
    
    let totalTests = 0;
    let passedTests = 0;
    
    Object.entries(testResults).forEach(([testName, result]) => {
        totalTests++;
        if (result.passed) {
            passedTests++;
            console.log(`✅ ${testName}: PASSED`);
        } else {
            console.log(`❌ ${testName}: FAILED`);
            if (result.issues.length > 0) {
                result.issues.forEach(issue => {
                    console.log(`   - ${issue}`);
                });
            }
        }
    });
    
    console.log('\n📈 SUMMARY');
    console.log(`Tests Passed: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Energy chart system is robust under edge cases.');
    } else {
        console.log('⚠️  Some tests failed. Review the issues above.');
    }
    
    // Clean up
    if (window.hideObjectInspector) {
        window.hideObjectInspector();
    }
};

// Export test functions for manual testing
window.energyChartTests = {
    runAllTests,
    testFastForwardMode,
    testRapidObjectSwitching,
    testPauseResume,
    testMemoryManagement,
    testOverallResponsiveness,
    generateTestReport,
    testResults
};

console.log('🧪 Energy Chart Edge Case Test Suite loaded!');
console.log('💡 Run "energyChartTests.runAllTests()" to start testing');
console.log('💡 Or run individual tests like "energyChartTests.testFastForwardMode()"'); 