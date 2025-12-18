// Define an object to store the weights for each section and sub-section
var sectionWeights;
/*
TODO:
- fill out the rest of the cases for each region
- add in "weighted values against each region, will be different some how"


/*var sectionWeights = {
  //north-east
  "north-east": {
    "Garden": {
      "North, East or West facing": 10,
      "High maintenance garden": 20,
      "Requires one off professional landscaping": 30,
      "Size just not quite right": 40,
      "Fencing requires replacing/work": 50,
      "Rubble/Junk removal required": 60,
      "No outside electric socket": 70,
      "No Water outlet": 70
    },
    "Kitchen": {
      "Full Kitchen refurbishment": 10,
      "Minor Kitchen refurbishment": 10,
      "Damaged Walls / Repair Required": 30,
      "Damp/Mold/Dew": 40,
      "Rubble/Junk removal required": 50,
      "Not enough counter space": 50,
      "Not enough storage": 50,
      "No Dishwasher": 50,
      "Textured Ceiling": 50,
      "Wallpaper removal": 50,
      "Windows/Frames require replacing": 50
    },
    "Lounge": {
      "Full Lounge refurbishment": 10,
      "Minor Lounge refurbishment": 10,
      "Damaged Walls / Repair Required": 30,
      "Damp/Mold/Dew": 40,
      "Repaint required": 50,
      "Damage": 50,
      "Textured Ceiling": 50,
      "Wallpaper removal": 50,
      "Windows/Frames require replacing": 50,
      "Fireplace/Log burner requires cleaning": 50
    },
    "Toilet": {
      "Full Toilet refurbishment": 10,
      "Minor Toilet refurbishment": 10,
      "Damaged Walls / Repair Required": 30,
      "Damp/Mold/Dew": 40,
      "Repaint required": 50,
      "Damage": 50,
      "Textured Ceiling": 50,
      "Wallpaper removal": 50,
      "No Shower": 50,
      "Poor/No Ventilation": 50,
      "Windows/Frames require replacing": 50
    },
    "Loft": {
      "No insulation": 10,
      "Not boarded for storage": 10,
      "No access ladder": 20
    },
    "Stairs/Stairwell/Hallway": {
      "Stairs require work": 10,
      "Damaged Walls / Repair Required": 30,
      "Damp/Mold/Dew": 40,
      "Repaint required": 50,
      "Textured Ceiling": 50,
      "Wallpaper removal": 50,
      "Windows/Frames require replacing": 50
    },
    "House Exterior": {
      "Facias require replacing": 10,
      "Damaged Roof / Repair Required": 30,
      "Damp/Mold/Dew": 40,
      "Repaint required": 50,
      "No Driveway": 50,
      "Driveway too small for required cars": 50
    },
    "House General": {
      "Boiler outdated/no service history": 10,
      "Electrics require replacing": 30,
      "No Central Heating": 40,
      "Rising Damp Symptoms": 50,
      "Poor EPC Rating (C or above)": 50
    },
    "Bedrooms": {
      "Boiler outdated/no service history": 10,
      "Size too small": 10,
      "Requires painting": 10,
      "Walls need work": 10,
      "Damage/Mold/Dew/leakage": 10,
      "Wallpaper removal": 10,
      "Skirting/fixture replacing": 10,
      "Textured Ceiling": 10,
      "Windows require replacing": 10,
    }
  },
*/
// Function to format currency input
function formatCurrency(input) {
    // Remove non-numeric characters except the pound sign
    input.value = input.value.replace(/[^0-9.]/g, '');
    // Remove any leading zeros
    input.value = input.value.replace(/^0+/, '');
    // Check if the input value is a valid number
    var parsedValue = parseFloat(input.value);
    if (!isNaN(parsedValue)) {
        // If it's a valid number, format with commas (using en-GB locale)
        input.value = parsedValue.toLocaleString('en-GB');
    } else {
        // If it's not a valid number, set the value to an empty string
        input.value = '';
    }
    // Adjust the size of the input box based on the length of the input value
    input.size = Math.max(10, input.value.length + 2); // Minimum size is 10 characters
}
// Function to handle region selection
function handleRegionSelection() {
    var regionSelect = document.getElementById('region');
    var selectedRegion = regionSelect.options[regionSelect.selectedIndex].text;
    // Depending on the selected region, update the weight values accordingly
    switch (selectedRegion) {
        case 'North East':
            sectionWeights = {
                "Garden": {
                    "North, East or West facing": 100000,
                    "High maintenance garden": 20,
                    "Requires one off professional landscaping": 30,
                    "Size just not quite right": 40,
                    "Fencing requires replacing/work": 50,
                    "Rubble/Junk removal required": 60,
                    "No outside electric socket": 70,
                    "No Water outlet": 70
                },
                "Kitchen": {
                    "Full Kitchen refurbishment": 10,
                    "Minor Kitchen refurbishment": 10,
                    "Damaged Walls / Repair Required": 30,
                    "Damp/Mold/Dew": 40,
                    "Rubble/Junk removal required": 50,
                    "Not enough counter space": 50,
                    "Not enough storage": 50,
                    "No Dishwasher": 50,
                    "Textured Ceiling": 50,
                    "Wallpaper removal": 50,
                    "Windows/Frames require replacing": 50
                },
                "Bedrooms": {
                    "Boiler outdated/no service history": 10,
                    "Size too small": 10,
                    "Requires painting": 10,
                    "Walls need work": 10,
                    "Damage/Mold/Dew/leakage": 10,
                    "Wallpaper removal": 10,
                    "Skirting/fixture replacing": 10,
                    "Textured Ceiling": 10,
                    "Windows require replacing": 10,
                }
                //end
            };
            break;
        case 'North West':
            sectionWeights = {
                "Garden": {
                    "North, East or West facing": 100,
                    "High maintenance garden": 200,
                    "Requires one off professional landscaping": 30,
                    "Size just not quite right": 40,
                    "Fencing requires replacing/work": 50,
                    "Rubble/Junk removal required": 60,
                    "No outside electric socket": 70,
                    "No Water outlet": 70
                },
                "Kitchen": {
                    "Full Kitchen refurbishment": 10,
                    "Minor Kitchen refurbishment": 10,
                    "Damaged Walls / Repair Required": 30,
                    "Damp/Mold/Dew": 40,
                    "Rubble/Junk removal required": 50,
                    "Not enough counter space": 50,
                    "Not enough storage": 50,
                    "No Dishwasher": 50,
                    "Textured Ceiling": 50,
                    "Wallpaper removal": 50,
                    "Windows/Frames require replacing": 50
                },
                // Other sections...
            };
            break;
        case 'Not Set':
            sectionWeights = {
                "Not Set": {
                    "Not Set": 0,
                },
                // Other sections...
            };
            break;
            // Add cases for other regions and update weight values accordingly
    }
}
//initialise the function
handleRegionSelection();
// Event listener for region selection change
document.getElementById('region').addEventListener('change', handleRegionSelection);

function updateTotal(checkbox) {
    // Check if sectionWeights is defined
    if (sectionWeights === "Not Set") {
        // Display error message on the screen
        var errorMessage = document.createElement('div');
        errorMessage.classList.add('error-message');
        errorMessage.textContent = 'Please select a region first.';
        document.body.appendChild(errorMessage);
        // Reset and untick checkboxes
        var checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked');
        checkboxes.forEach(function(checkbox) {
            checkbox.checked = false;
        });
        // Remove error message after 3 seconds
        setTimeout(function() {
            errorMessage.remove();
        }, 3000);
        return;
    }
    var currencyInput = document.getElementById('currency');
    var inputValue = currencyInput.value.replace(/,/g, ''); // Remove commas from the input value
    var totalPoints = parseFloat(inputValue) || 0; // Get the input value as a number, default to 0 if empty
    var checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked');
    // Check if the input box is empty
    if (inputValue === '') {
        currencyInput.classList.add('error');
        currencyInput.setAttribute('placeholder', 'Enter asking price');
        // Unselect all checkboxes
        checkboxes.forEach(function(checkbox) {
            checkbox.checked = false;
        });
        return;
    } else {
        currencyInput.classList.remove('error');
        currencyInput.removeAttribute('placeholder');
    }
    var regionSelectBox = document.getElementById('region');
    // Check if the region box is empty
    if (regionSelectBox.value === '') {
        regionSelectBox.classList.add('error');
        alert('Please select a region');
        // Unselect all checkboxes
        checkboxes.forEach(function(checkbox) {
            checkbox.checked = false;
        });
        return;
    } else {
        regionSelectBox.classList.remove('error');
    }
    checkboxes.forEach(function(checkbox) {
        // Check if the checkbox belongs to a room
        if (checkbox.parentElement.classList.contains('checkbox-row')) {
            var roomLabel = checkbox.closest('.room-frame').querySelector('.room-label').textContent.trim();
            var subSection = checkbox.parentElement.textContent.trim();
            var value = sectionWeights[roomLabel][subSection];
        } else {
            // Get the section and subsection text
            var section = checkbox.closest('.checkbox-group').querySelector('.checkbox-group-header').textContent.trim();
            var subSectionText = checkbox.parentElement.textContent.trim();
            // Check if tooltip exists
            var iconIndex = subSectionText.indexOf(' i'); // Find the index of the non-breaking space followed by 'i'
            if (iconIndex !== -1) { // Tooltip exists
                var subSection = subSectionText.substring(0, iconIndex).trim(); // Extract the text before the tooltip
            } else { // Tooltip does not exist
                var subSection = subSectionText;
            }
            var value = sectionWeights[section] ? sectionWeights[section][subSection] : undefined;
        }
        // Log section and subSection values for debugging
        console.log("Section:", section);
        console.log("Subsection:", subSection);
        console.log("Value:", value);
        console.log(sectionWeights);
        // Handle special cases where direct value access is not working
        if (subSection.trim === "High maintenance garden" || subSection.trim === "No access" || subSection.trim === "Fascias require replacing") {
            value = sectionWeights[section][subSection.trim];
        }
        totalPoints -= parseFloat(value) || 0;
    });
    // Ensure the total points is not negative
    totalPoints = Math.max(totalPoints, 0);
    // Format the total points with commas and no decimal places (using en-GB locale)
    document.getElementById('totalPoints').value = totalPoints.toLocaleString('en-GB');
}

function updateRoomCount(select) {
    var roomCount = parseInt(select.value);
    var currentRoomCount = document.querySelectorAll('.room-frame').length;
    // If the current room count is 0, no need to ask for confirmation
    if (currentRoomCount === 0) {
        updateRoomDisplay(roomCount);
        return;
    }
    // Show confirmation dialog if the room count is changing
    var confirmMessage = "Are you sure you want to change the room count?";
    if (!window.confirm(confirmMessage)) {
        // Reset the select to the previous value
        select.value = currentRoomCount.toString();
        return;
    }
    updateRoomDisplay(roomCount);
}

function updateRoomDisplay(roomCount) {
    var roomsGroup = document.querySelector('.rooms-group');
    // Remove existing room checkboxes
    var existingRoomCheckboxes = roomsGroup.querySelectorAll('.room-frame');
    existingRoomCheckboxes.forEach(function(roomCheckbox) {
        roomCheckbox.remove();
    });
    // Show checkboxes if roomCount is greater than 0
    if (roomCount > 0) {
        for (var i = 0; i < roomCount; i++) {
            var roomFrame = document.createElement('div');
            roomFrame.classList.add('room-frame');
            // Adjust margin-right for rooms 1, 3, and 5
            if ([0, 2, 4].includes(i)) {
                roomFrame.style.marginRight = '50px';
            } else {
                roomFrame.style.marginRight = '20px'; // Default margin-right for other rooms
            }
            var roomLabel = document.createElement('div');
            roomLabel.classList.add('room-label');
            roomLabel.textContent = 'Room ' + (i + 1) + ':';
            roomFrame.appendChild(roomLabel);
            var roomCheckboxGroup = document.createElement('div');
            roomCheckboxGroup.classList.add('checkbox-row');
            var pointLabels = ['Size too small', 'Requires painting', 'Walls need work', 'Damage/Mold/Dew/leakage', 'Wallpaper removal', 'Skirting/fixture replacing', 'Textured Ceiling', 'Windows require replacing'];
            pointLabels.forEach(function(pointLabel, index) {
                var checkboxWrapper = document.createElement('label'); // Wrap each checkbox and label in a <label> element
                var pointCheckbox = document.createElement('input');
                pointCheckbox.setAttribute('type', 'checkbox');
                pointCheckbox.setAttribute('value', (index + 1).toString());
                pointCheckbox.setAttribute('onchange', 'updateTotal(this)');
                var checkboxId = 'room-' + (i + 1) + '-' + pointLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                pointCheckbox.id = checkboxId;
                pointCheckbox.dataset.configId = checkboxId;
                checkboxWrapper.appendChild(pointCheckbox);
                checkboxWrapper.appendChild(document.createTextNode(' ' + pointLabel)); // Append the label text to the label element
                roomCheckboxGroup.appendChild(checkboxWrapper); // Append the label to the checkbox group
            });
            roomFrame.appendChild(roomCheckboxGroup);
            roomsGroup.appendChild(roomFrame);
        }
    }
}

function slugifyForConfig(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function collectCheckboxStates() {
    var checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
    return Array.prototype.map.call(checkboxes, function(checkbox, index) {
        if (!checkbox.id) {
            var autoId = checkbox.dataset.configId || 'checkbox-' + index + '-' + slugifyForConfig(checkbox.parentElement.textContent || 'item');
            checkbox.dataset.configId = autoId;
            checkbox.id = autoId;
        }
        return {
            id: checkbox.id || checkbox.dataset.configId,
            checked: checkbox.checked
        };
    });
}

function applyCheckboxStates(savedCheckboxes) {
    if (!Array.isArray(savedCheckboxes)) {
        return;
    }
    savedCheckboxes.forEach(function(savedCheckbox) {
        var checkbox = document.getElementById(savedCheckbox.id) || document.querySelector('[data-config-id="' + savedCheckbox.id + '"]');
        if (checkbox) {
            checkbox.checked = savedCheckbox.checked;
        }
    });
}

function buildConfigObject() {
    return {
        region: document.getElementById('region').value || '',
        propertyType: document.getElementById('property-type').value || '',
        askingPrice: document.getElementById('currency').value || '',
        roomCount: document.getElementById('room-count').value || '0',
        checkboxes: collectCheckboxStates()
    };
}

function buildShareableUrl() {
    var config = buildConfigObject();
    var encodedConfig = btoa(JSON.stringify(config));
    var url = new URL(window.location.href);
    url.searchParams.set('config', encodedConfig);
    return url.toString();
}

function applyConfigFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var rawConfig = params.get('config');
    if (!rawConfig) {
        return;
    }
    try {
        var decodedConfig = JSON.parse(atob(rawConfig));
        if (decodedConfig.region) {
            var regionSelect = document.getElementById('region');
            regionSelect.value = decodedConfig.region;
            handleRegionSelection();
        }
        if (decodedConfig.propertyType) {
            document.getElementById('property-type').value = decodedConfig.propertyType;
        }
        if (decodedConfig.askingPrice) {
            var currencyInput = document.getElementById('currency');
            currencyInput.value = decodedConfig.askingPrice;
            formatCurrency(currencyInput);
        }
        if (decodedConfig.roomCount) {
            var roomCountSelect = document.getElementById('room-count');
            roomCountSelect.value = decodedConfig.roomCount;
            updateRoomDisplay(parseInt(decodedConfig.roomCount, 10));
        }
        applyCheckboxStates(decodedConfig.checkboxes);
        updateTotal();
    } catch (error) {
        console.warn('Unable to apply config from URL:', error);
    }
}

function setShareStatus(message) {
    var statusEl = document.getElementById('share-link-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function setupShareLink() {
    var shareBtn = document.getElementById('share-link-btn');
    var shareOutput = document.getElementById('share-link-output');
    if (!shareBtn) {
        return;
    }
    shareBtn.addEventListener('click', function() {
        var shareableUrl = buildShareableUrl();
        if (shareOutput) {
            shareOutput.value = shareableUrl;
        }
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(shareableUrl).then(function() {
                setShareStatus('Link copied to clipboard.');
            }).catch(function() {
                setShareStatus('Copy failed. Use the textbox to copy manually.');
                if (shareOutput) {
                    shareOutput.focus();
                    shareOutput.select();
                }
            });
        } else {
            setShareStatus('Link ready. Copy it from the textbox.');
            if (shareOutput) {
                shareOutput.focus();
                shareOutput.select();
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
    var currencyInput = document.getElementById('currency');
    currencyInput.value = ''; // Initialize the input box value to an empty string
    applyConfigFromUrl();
    setupShareLink();
});
