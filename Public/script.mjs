// GLOBAL VARIABLES 
let username = '';
let jwtToken = '';  // To store JWT token

function isTokenExpired(token) {
    const decoded = jwt_decode(token);
    console.log('Decoded token:', decoded); // Check the token contents
    return decoded.exp < Date.now() / 1000;
}

function checkLoginStatus() {
    const token = localStorage.getItem('jwtToken'); // Retrieve token from localStorage

    console.log("Token in localStorage:", token); // Debug log

    if (token && !isTokenExpired(token)) { // Check if token is not expired
        console.log("Token found and valid, checking login status...");

        fetch('/M00671293/login', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Send JWT token stored in localStorage
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.isLoggedIn && data.userId) {
                    console.log("User is already logged in.");
                    updateHomepage(true, data.username); // Pass username if logged in
                } else {
                    console.log("User is not logged in.");
                    updateHomepage(false); // Update homepage to show logged-out state
                }
            })
            .catch(error => {
                console.error("Error checking session:", error);
                updateHomepage(false); // Show logged-out state on error
            });
    } else {
        console.log("No valid token found or token expired.");
        updateHomepage(false); // Update homepage to show logged-out state
    }
}

function updateHomepage(isLoggedIn) {
    if (isLoggedIn) {
        console.log('User is logged in. Showing homepage.');
        hideAllAuth();
        showHomepage();
    } else {
        console.log('User not logged in. Showing authentication page');
        showAuth();
        hideHomepage();

    }
}

// ===== UI FUNCTIONALITY ===== //   
function showAuth() {
    $('#mainContainer').removeClass('d-none');
    $('#logoHeader').removeClass('d-none');
    $('#registrationFormContainer').addClass('d-none');
    $('#loginFormContainer').addClass('d-none');
}
function hideAllAuth() {
    $('#mainContainer').addClass('d-none');
    $('#loginFormContainer').addClass('d-none');
    $('#registrationFormContainer').addClass('d-none');
    $('#logoHeader').addClass('d-none');
}
function showHomepage() {
    $('#navbar').removeClass('d-none');
    $('#sidebar').removeClass('d-none');
    $('#feedCard').removeClass('d-none');
    $('#mainContent').removeClass('d-none');
    $('#postForm').removeClass('d-none');
    // HIDE OTHER PAGES
    $('#profilePage').addClass('d-none');
    $('#userProfile').addClass('d-none');
}
function hideHomepage() {
    $('#navbar').addClass('d-none');
    $('#sidebar').addClass('d-none');
    $('#feedCard').addClass('d-none');
    $('#mainContent').addClass('d-none');
    $('#postForm').addClass('d-none');
    $('#profilePage').addClass('d-none');
    $('#userProfile').addClass('d-none');
}

function fetchAndDisplayPosts() {
    console.log('Fetching posts...'); 

    // Clear the feed container before loading new posts
    $('#feedContainer').empty();

    const jwtToken = localStorage.getItem('jwtToken');  // Get token from localStorage
    if (!jwtToken) {
        console.log('No JWT token found.');
        return;
    }

    // Fetch posts from the server
    $.ajax({
        url: '/M00671293/contents',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${jwtToken}`  // Include token in Authorization header
        },
        success: function (response) {
            console.log('Posts retrieved successfully:', response);  

            const { posts, message } = response;

            // If no posts are found, show a message
            if (!posts || posts.length === 0) {
                $('#feedContainer').text(message || 'No posts available.');
                return;
            }

            // Render each post in the feed
            posts.forEach(post => displayPost(post));
        },
        error: function (error) {
            console.error('Error retrieving posts:', error);

            if (error.status === 401) {
                alert('You must be logged in to view posts.');
            } else {
                alert('An error occurred while loading posts. Please try again later.');
            }
        }
    });
}


$(document).ready(async function () {

    // Run the login status check on page load
    checkLoginStatus();

    fetchAndDisplayPosts();

    function loadUserProfile() {
        // Get the username from the URL (query string)
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('username');  // Expecting ?username=username in the URL

        // Check if the username exists in the URL
        if (!username) {
            console.error('Username not provided!');
            return;
        }

        $.ajax({
            url: `/M00671293/users/${username}`,  // API route to get profile data
            method: 'GET',
            success: function (data) {
                if (data.success) {
                    // Dynamically update the profile page with the fetched data
                    $('#profileName').text(data.name); // Name
                    $('#postsCount').text(data.postsCount); // Posts count
                    $('#followersCount').text(data.followersCount); // Followers count
                    $('#followingsCount').text(data.followingsCount); // Followings count
                    $('.userBio').text(data.bio); // Bio text

                    // Display the posts if available
                    const postsContainer = $('#userProfilePosts');
                    postsContainer.empty();  // Clear previous posts
                    if (data.posts.length > 0) {
                        data.posts.forEach(post => {
                            postsContainer.append(`<div class="post">${post.content}</div>`); // Display each post
                        });
                    } else {
                        postsContainer.append('<p>No posts available.</p>'); // Show no posts message
                    }

                    // Show the profile page
                    $('#userProfilePage').removeClass('d-none');
                } else {
                    console.error('Error fetching user profile:', data.error);
                    // Handle error if user not found or another issue occurs
                    $('#userProfilePage').html('<p>Error fetching user profile. Please try again later.</p>');
                }
            },
            error: function (xhr, status, error) {
                console.error('AJAX Error:', error);
                // Show error message if AJAX request fails
                $('#userProfilePage').html('<p>Error fetching user profile. Please try again later.</p>');
            }
        });
    }


    // ===== POST UPLOAD ===== // 
    $('#postForm').on('submit', function (event) {
        event.preventDefault();

        const postContent = $('#postContent').val().trim();
        const imagePreviews = $('#imagePreviewContainer img');

        // Retrieve username from localStorage or fallback to 'defaultUsername'
        const token = localStorage.getItem('jwtToken');  // Retrieve JWT token from localStorage
        const username = token ? jwt_decode(token).username : 'defaultUsername';

        if (!postContent && !imagePreviews.length) {
            alert('Please enter text or upload an image before posting.');
            return;
        }

        const images = [];
        imagePreviews.each(function () {
            images.push($(this).attr('src'));
        });

        const postData = {
            username,
            content: postContent,
            image: images
        };

        $.ajax({
            url: '/M00671293/contents',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(postData),
            success: function (response) {
                console.log('Post created successfully:', response);
                displayPost(response.post);  // Display the new post
                resetForm();
            },
            error: function (error) {
                console.error('Error creating post:', error);
                alert('There was an error creating your post. Please try again.');
            }
        });
    });

    function displayPost(post) {
        const postContainer = $('<div>').addClass('post');

        // Set the post ID as a data attribute for the post container
        postContainer.attr('data-post-id', post._id);  // Attach postId (_id from MongoDB)

        // Add username above the post content
        const usernameElement = $('<p>').text(post.username).addClass('postUsername');
        postContainer.append(usernameElement);

        // Add the content of the post
        if (post.content) postContainer.append($('<p>').text(post.content).css('margin-bottom', '10px'));

        // Add images if any
        if (post.image && post.image.length) {
            const imagesContainer = $('<div>').css({
                'display': 'grid',
                'grid-template-columns': post.image.length > 2 ? '1fr 1fr' : '1fr',
                'gap': '5px'
            });
            post.image.forEach(imgSrc => {
                imagesContainer.append($('<img>').attr('src', imgSrc).addClass('postImage'));
            });
            postContainer.append(imagesContainer);
        }

        // Add timestamp
        const timestamp = new Date(post.createdAt);
        const timestampElement = $('<p>').text(timestamp.toLocaleString()).addClass('postTimestamp');
        postContainer.append(timestampElement);

        // Divider after the post content
        postContainer.append('<hr>');

        // Post actions: like and comment icons
        const actionsContainer = $('<div>').addClass('post-actions');
        const heartIcon = $('<i>').addClass('fa-regular fa-heart heart-icon');
        const commentIcon = $('<i>').addClass('fa-regular fa-comment comment-icon');
        actionsContainer.append(heartIcon, commentIcon);
        postContainer.append(actionsContainer);

        // Display comments for this post if any
        if (post.comments && post.comments.length) {
            const commentsContainer = $('<div>').addClass('comments-container');
            post.comments.forEach(comment => {
                const commentElement = $('<div>').addClass('comment');
                const commentUsername = $('<p>').addClass('comment-username').text(comment.username);
                const commentText = $('<p>').addClass('comment-text').text(comment.commentText);
                commentElement.append(commentUsername, commentText);
                commentsContainer.append(commentElement);
            });
            postContainer.append(commentsContainer);
        }

        // Add the post to the feed
        $('#feed').prepend(postContainer);

        postContainer.css({
            'max-width': '600px',
            'width': '100%',
            'margin': '0 auto 15px',
            'padding': '10px',
        });
    }

    // Handle file input change to show image previews
    $('#formFileMultiple').on('change', function () {
        handleImagePreviews(this.files);
    });

    // Toggle heart icon like status
    $(document).on('click', '.heart-icon', function () {
        if ($(this).hasClass('fa-regular')) {
            $(this).removeClass('fa-regular fa-heart').addClass('fa-solid fa-heart');
            $(this).css('color', '#f7819e'); // Pink color when liked
        } else {
            $(this).removeClass('fa-solid fa-heart').addClass('fa-regular fa-heart');
            $(this).css('color', '#9f86c0'); // Default color when not liked
        }
    });

    // Toggle comment form visibility
    $(document).on('click', '.comment-icon', function () {
        const commentForm = $(this).closest('.post').find('.comment-form');

        // Debugging log to check if the comment form is being selected
        console.log('Comment form:', commentForm);

        if (commentForm.length) {
            commentForm.toggleClass('d-none');
            console.log('Form visibility after toggle:', commentForm.hasClass('d-none') ? 'Hidden' : 'Visible');
        } else {
            console.error('Comment form not found for this post');
        }
    });

    // Toggle comment form visibility (dynamically create the form)
    $(document).on('click', '.comment-icon', function () {
        const postElement = $(this).closest('.post'); // Get the parent post element
        let commentForm = postElement.find('.comment-form'); // Check if form already exists

        // If form doesn't exist, create the comment form dynamically
        if (commentForm.length === 0) {
            commentForm = $('<div class="comment-form">')
                .append(
                    $('<textarea class="comment-textarea" placeholder="Write your comment...">'),
                    $('<button class="submit-comment">Submit</button>')
                );

            postElement.append(commentForm);
        }

        // Toggle visibility of the form
        commentForm.toggleClass('d-none');
    });

    // Toggle comment form visibility
    $(document).on('click', '.comment-icon', function () {
        const commentForm = $(this).closest('.post').find('.comment-form');
        commentForm.toggleClass('d-none');
    });

    // Submit comment via AJAX
    $(document).on('click', '.submit-comment', function () {
        const commentText = $(this).prev('.comment-textarea').val().trim();

        if (commentText) {
            // Retrieve token from localStorage
            const token = localStorage.getItem('jwtToken');
            if (!token) {
                console.log('No token found. Please log in first.');
                alert('You must be logged in to submit a comment.');
                return;
            }

            // Decode the JWT token
            const decodedToken = jwt_decode(token);
            const username = decodedToken.username;

            // Get the postId from the post's data attribute
            const postId = $(this).closest('.post').data('post-id');
            if (!postId) {
                console.error('Post ID not found.');
                return;
            }

            // Send AJAX request to submit the comment
            $.ajax({
                url: `/M00671293/contents/${postId}/comments`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    username: username,
                    commentText: commentText,
                    postId: postId
                }),
                success: function (response) {
                    console.log('Comment created successfully:', response);

                    // Create a new comment container and display it
                    const commentContainer = $('<div>').addClass('commentContainer')
                        .css({
                            'border': '1px solid #ddd',
                            'padding': '5px',
                            'border-radius': '5px',
                            'background': '#f1f1f1',
                            'margin-top': '5px'
                        });

                    const usernameElement = $('<p>').addClass('comment-username').text(username);
                    const commentTextElement = $('<p>').addClass('comment-text').text(commentText);

                    commentContainer.append(usernameElement, commentTextElement);
                    $(this).closest('.post').append(commentContainer);

                    // Clear the comment textarea
                    $(this).prev('.comment-textarea').val('');

                    // Hide the comment form after submission
                    $(this).closest('.comment-form').addClass('d-none');
                },
                error: function (error) {
                    console.error('Error creating comment:', error);
                }
            });
        } else {
        }
    });


    // IMAGE PREVIEWS in the post form
    function handleImagePreviews(files) {
        const previewContainer = $('#imagePreviewContainer');
        previewContainer.empty().removeClass('d-none');

        Array.from(files).slice(0, 4).forEach(file => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const imgWrapper = $('<div>').addClass('image-preview').css({
                    'position': 'relative',
                    'display': 'inline-block'
                });
                const img = $('<img>').attr('src', e.target.result).css({
                    'width': '100px',
                    'height': '100px',
                    'object-fit': 'cover',
                    'margin': '5px',
                    'border-radius': '5px'
                });
                const removeIcon = $('<i>').addClass('fa-solid fa-xmark remove-image').css({
                    'position': 'absolute',
                    'top': '5px',
                    'right': '5px',
                    'cursor': 'pointer',
                    'color': '#ff0000'
                });
                imgWrapper.append(img).append(removeIcon);
                previewContainer.append(imgWrapper);
            };
            reader.readAsDataURL(file);
        });
    }

    // IMAGE PREVIEW removal
    $(document).on('click', '.remove-image', function () {
        $(this).closest('.image-preview').remove();
        if ($('#imagePreviewContainer').children().length === 0) {
            $('#imagePreviewContainer').addClass('d-none');
        }
    });

    function resetForm() {
        $('#postContent').val('');
        $('#formFileMultiple').val('');
        $('#imagePreviewContainer').empty().addClass('d-none');
    }

    // ================================================================ //
    // ===== LOGIN FORM SUBMISSION ===== //
    $("#loginForm").on("submit", async (event) => {
        event.preventDefault();
        console.log("Login form submitted");

        // Gather login form data
        const formData = gatherLoginFormData();
        console.log("Form data gathered:", formData);  // Log the form data to see what's being sent

        resetAlerts(); // Reset all alerts

        // Validate form input
        if (validateLoginForm(formData)) {
            console.log("Form data validated. Showing loading spinner...");
            toggleLoading(true); // Show loading spinner immediately
            $("#login").hide(); // Hide the login button
            console.log("Login button hidden.");

            let response; // Define response outside of try block
            try {
                // Send login request
                response = await fetch('/M00671293/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });
                console.log("Login request sent.");

                const data = await response.json(); // Parse response
                console.log("Response received:", data);  // Log the response from the server

                // Handle different responses
                if (response.ok && data.message === 'Login successful.') {
                    console.log("User logged in successfully.");
                    localStorage.setItem('jwtToken', data.token); // Save JWT token
                    console.log("JWT token saved in localStorage.");

                    // Populate the profile name field
                    const fullName = `${data.firstName} ${data.lastName}`;
                    console.log("Full name to display:", fullName);
                    $('#profileName').text(fullName);
                    console.log("Profile name updated:", $('#profileName').text());  // Log the updated profile name

                    // Show success alert after a delay
                    setTimeout(() => {
                        console.log("Showing success alert...");
                        showLoggedInAlert(); // Show success alert

                        // Update homepage after a delay
                        setTimeout(() => {
                            console.log("Updating homepage...");
                            updateHomepage(true);
                        }, 2000); // 2-second delay
                    }, 3000); // 3-second delay for spinner before showing alert

                } else {
                    console.log("Login failed:", data);
                    handleLoginError(response.status, data);  // Handle login errors
                }
            } catch (error) {
                console.error('Error during login:', error);
                handleLoginError(500, { message: 'Unexpected error occurred.' }); // Handle unexpected errors
            } finally {
                // Ensure spinner stays visible for at least 3 seconds if response is successful
                if (response && response.ok) {
                    setTimeout(() => {
                        console.log("Finished login process, hiding spinner and showing login button.");
                        toggleLoading(false); // Hide loading spinner
                        $("#login").show(); // Show the login button again after loading
                    }, 3000); // Ensure spinner stays visible for at least 3 seconds
                } else {
                    toggleLoading(false);
                    $("#login").show();
                }
            }
        } else {
            console.log("Form validation failed.");
            toggleAlert("loginFieldsRequiredAlert", true); // Show alert for missing fields
        }
    });


    // Reset individual field alerts when input changes
    $("#loginForm input").on("input", function () {
        const fieldId = $(this).attr("id");

        if (fieldId === "usernameLogin") {
            toggleAlert("usernameLoginDoesNotExist", false);
        } else if (fieldId === "passwordLogin") {
            toggleAlert("incorrectPasswordLogin", false);
        }

        // Check if the form is now valid and handle button visibility
        const formData = gatherLoginFormData();
        if (validateLoginForm(formData)) {
            $("#login").show(); // Ensure login button is visible
        }
    });

    // Function to gather login form data
    function gatherLoginFormData() {
        return {
            username: $("#usernameLogin").val(),
            password: $("#passwordLogin").val()
        };
    }

    // Function to validate the login form
    function validateLoginForm(formData) {
        if (!formData.username || !formData.password) {
            toggleAlert("loginFieldsRequiredAlert", true);
            return false;
        }
        return true;
    }

    // Consistent error handling for login
    function handleLoginError(status, errorData) {
        toggleLoading(false); // Hide loading spinner immediately
        $("#login").show(); // Show the login button again

        if (status === 404) {
            console.log("Username does not exist. Triggering alert.");
            toggleAlert('usernameLoginDoesNotExist', true);
        } else if (status === 400 && errorData.message === 'Invalid password.') {
            console.log("Incorrect password. Triggering alert.");
            toggleAlert('incorrectPasswordLogin', true);
        } else {
            console.error('Unexpected error:', errorData.message);
            toggleAlert('incorrectPasswordLogin', true);
        }
    }


    $("#registrationForm").on("submit", async (event) => {
        event.preventDefault();
        console.log("Registration form submitted");
    
        // Gather form data
        const formData = {
            firstName: $("#firstName").val(),
            lastName: $("#lastName").val(),
            username: $("#username").val(),
            email: $("#email").val(),
            password: $("#password").val(),
            confirmPassword: $("#confirmPassword").val()
        };
    
        resetAlerts(); // Clear any existing alerts
        toggleLoading(true); // Show loading spinner
    
        try {
            // Submit registration form
            const response = await fetch('/M00671293/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
    
            const data = await response.json();
            console.log("Full server response:", data);
    
            setTimeout(() => {
                toggleLoading(false); // Hide loading spinner
    
                if (response.ok && data.message === 'User registered successfully.') {
                    console.log("User registered successfully");
                    toggleAlert("registeredSuccessfully", true);
                    localStorage.setItem('jwtToken', data.token);
    
                    setTimeout(() => {
                        // Show mainContainer and hide registrationFormContainer
                        $("#registrationFormContainer").addClass('d-none');
                        $("#mainContainer").removeClass('d-none');
                    }, 3000); // Delay after success alert
                } else {
                    console.log("Server error: Registration failed");
                    toggleAlert("registrationError", true); // Show registration error alert
                }
            }, 3000); // Spinner visible for 3 seconds
        } catch (error) {
            console.error("Error registering user:", error);
            toggleAlert("registrationError", true); // Show registration error alert
        } finally {
            toggleLoading(false); // Hide loading spinner
        }
    });
    



    // ============================================================= //
    // ===== LOG OUT FUNCTIONALITY ===== //   
    $('#signOut').on('click', function (event) {
        event.preventDefault();

        // Send DELETE request to logout
        $.ajax({
            url: '/M00671293/login',
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('jwtToken') // Send JWT token in the header
            },
            success: function (response) {
                console.log('Logout successful:', response);

                // Remove JWT token from localStorage
                localStorage.removeItem('jwtToken');  // Remove the JWT token

                updateHomepage(false);

            },
            error: function (error) {
                console.error('Error logging out:', error);
                alert('There was an error logging out. Please try again.');
            }
        });
    });

    // ============================================================= //
    // ===== USER PROFILE MANAGEMENT ===== // 
    $('editProfileForm').submit(function (e) {
        e.preventDefault();
        console.log("Edit profile form submitted");

        const firstName = $('#firstNameProfile').val();
        const lastName = $('#lastNameProfile').val();
        const bio = $('#userBio').val();
        const profilePicture = $('#userPictureUpload')[0].files[0];

        // Check if all fields are empty
        if (!firstName && !lastName && !bio && !profilePicture) {
            console.log('Please fill in at least one field to update your profile.');
            return; // Stop the submission if all fields are empty
        }

        console.log('Fields validated. Proceeding with profile update.');

        // Check if the profile picture is a valid image file
        if (profilePicture) {
            if (!profilePicture.type.startsWith('image/')) {
                console.log('Uploaded file is not an image:', profilePicture);
                const errorMessage = $('<small id="fileError" style="color: red;">Please upload a valid image file.</small>');
                $('#userPictureUpload').after(errorMessage);
                return; // Stop the submission if the file is not an image
            } else {
                console.log('Profile picture is a valid image file:', profilePicture);
            }
        }

        // Prepare the form data for submission
        const formData = new FormData();
        if (firstName) formData.append('firstName', firstName);
        if (lastName) formData.append('lastName', lastName);
        if (bio) formData.append('bio', bio);
        if (profilePicture) formData.append('profilePicture', profilePicture);

        console.log('Form data prepared:', formData);

        $.ajax({
            url: '/M00671293/users/editProfile', 
            type: 'POST',
            data: formData,
            processData: false, 
            contentType: false, 
            success: function (response) {
                console.log('Profile updated successfully:', response);
                const successMessage = $('<small id="formError" style="color: green;">Profile updated successfully!</small>');
                $('#editProfileForm').prepend(successMessage);
            },
            error: function (xhr, status, error) {
                console.error('Error updating profile:', error);
                alert('Error updating profile. Please try again.');
            }
        });
    });

    function showHomepage() {
        // Hide the profile page
        $('#profile-page').addClass('d-none');

        // Show the post form (for the homepage)
        $('#post-form').removeClass('d-none');
    }

    // ================================ //
    // ===== SEARCH FUNCTIONALITY ===== //
    // Handle search input form submission
    $('#searchButton').click(async function (event) {
        event.preventDefault();  // Prevent the form from submitting normally

        const query = $('#inputHomepage').val().trim();  // Get the query from the search input
        console.log('Search query:', query);

        if (!query) {
            $('#searchResultsContainer').hide();  // Hide the results container if no query
            return;  // Do nothing if the query is empty
        }

        try {
            // Send GET request to search for users
            const response = await fetch(`/M00671293/users/search?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                // If response is not successful, show error message in the container
                $('#searchResultsContainer').html('<p>Error during search. Please try again later.</p>');
                $('#searchResultsContainer').show();

                // Set a timeout to hide the message after 3 seconds (3000 milliseconds)
                setTimeout(function () {
                    $('#searchResultsContainer').fadeOut();
                }, 3000);  // 3000ms = 3 seconds

                return;
            }

            const data = await response.json();

            // Check if data is an array of users and not empty
            if (Array.isArray(data) && data.length > 0) {
                displaySearchResults(data);  // Display the results if users were found
            } else {
                $('#searchResultsContainer').html('<p>No users found.</p>');  // Show no results message
                $('#searchResultsContainer').show();  // Ensure the container is visible
            }
        } catch (error) {
            // Handle any error that occurs during the fetch request
            $('#searchResultsContainer').html('<p>Error during search. Please try again later.</p>');
            $('#searchResultsContainer').show();  // Show error message in the container
        }
    });

    // Function to display search results
    function displaySearchResults(users) {
        let resultsHTML = '';
        users.forEach(user => {
            resultsHTML += `
        <div class="search-result">
            <p><strong>${user.firstName} ${user.lastName}</strong> (@${user.username})</p>
            <!-- The link should trigger the profile display function -->
            <a href="javascript:void(0);" class="view-profile-link" data-username="${user.username}">View Profile</a>
        </div>
    `;
        });

        // Insert the results into the searchResultsContainer and make sure it's visible
        $('#searchResultsContainer').html(resultsHTML);
        $('#searchResultsContainer').show();
    }

    // Event listener for clicks on the "View Profile" link
    $('#searchResultsContainer').on('click', '.view-profile-link', function () {
        const username = $(this).data('username');  // Get the username from the data attribute
        console.log('Loading profile of:', username);

        // Call function to load user profile dynamically
        checkUserProfilePage(username);
    });

    async function checkUserProfilePage(username) {
        try {
            const response = await fetch(`/M00671293/users/${username}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                console.error('Error loading user profile:', response.statusText);
                return;
            }

            const userProfile = await response.json();

            // Log the user profile data for debugging
            console.log('User Profile:', userProfile);

            // Handle missing values with fallback text
            const profileName = userProfile.name || 'Unknown User';
            const usernameText = userProfile.username || 'Unknown User';
            const bioText = userProfile.bio || 'No bio available.';

            // Ensure postsCount, followersCount, and followingsCount are set to 0 if they are undefined or null
            const postsCount = userProfile.postsCount || 0;
            const followersCount = userProfile.followersCount || 0;
            const followingsCount = userProfile.followingsCount || 0;

            // Populate the user profile with the retrieved data
            $('#userProfileName').text(profileName);
            $('#userProfileUsername').text(`@${usernameText}`);
            $('#userProfileBio').text(bioText);
            $('#userProfilePostsCount').text(postsCount);
            $('#userProfileFollowersCount').text(followersCount);
            $('#userProfileFollowingsCount').text(followingsCount);

            // Show the profile page and remove the 'd-none' class
            $('#userProfilePage').removeClass('d-none');

            // Hide the search results and homepage if they are visible
            $('#searchResultsContainer').addClass('d-none');
            $('#postForm').addClass('d-none');
            $('#profilePage').addClass('d-none');


        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    }



    // ============================================================= //
    // ===== ALERTS MANAGEMENT ===== // 
    // Show alerts
    const toggleAlert = (alertId, show) => {
        console.log(`${show ? 'Showing' : 'Hiding'} alert with ID: ${alertId}`);
        $(`#${alertId}`).toggleClass('d-none', !show);
    };

    // Reset alerts
    const resetAlerts = () => {
        $(".alert").addClass("d-none");
    };

    // Successful registration
    const showRegistrationSuccessAlert = () => {
        toggleAlert("registeredSuccessfully", true);
        setTimeout(() => {
            hideSuccessAlert();
            window.location.href = "/M00671293";
        }, 3000); // 3 seconds before redirect
    };

    // Hide registration success alert
    const hideSuccessAlert = () => {
        toggleAlert("registeredSuccessfully", false);
    };

    // Successful log in
    const showLoggedInAlert = () => {
        toggleAlert("loggedInSuccessfully", true);
        setTimeout(() => {
            hideLoggedInAlert();
        }, 2000); // Hide alert after 2 seconds
    };

    // Hide logged-in alert
    const hideLoggedInAlert = () => {
        toggleAlert("loggedInSuccessfully", false);
    };

    // ============================================================= //

    // ===== PASSWORD TOGGLE VISIBILITY ===== //   
    $("#togglePasswordLogin").on("click", () => togglePasswordVisibility($("#passwordLogin")));

    $("#togglePassword").on("click", () => togglePasswordVisibility($("#password")));

    $("#toggleConfirmPassword").on("click", () => togglePasswordVisibility($("#confirmPassword")));

    // ============================================================= //   

    // ===== ONCLICK EVENT LISTENERS IN AUTH PAGE ===== //   
    $('#createAccountBtn').on("click", function () {
        console.log("Create Account button clicked");
        switchForms($('#mainContainer'), $('#registrationFormContainer'));
    });

    $('#loginLink').on("click", function () {
        console.log("Login link clicked");
        switchForms($('#mainContainer'), $('#loginFormContainer'));
        $('#registrationFormContainer').addClass('d-none');
    });

    $('#loginLinkInRegister').on("click", function () {
        console.log("Login link in register form clicked");
        switchForms($('#registrationFormContainer'), $('#loginFormContainer'));
    });

    $('#logoHeader').on('click', function () {
        console.log("Logo clicked");
        $('#mainContainer').removeClass('d-none').css('display', 'block');
        $('#loginFormContainer').addClass('d-none').css('display', 'none');
        $('#registrationFormContainer').addClass('d-none').css('display', 'none');
    });

    // ===== ONCLICK EVENT LISTENERS IN HOMEPAGE ===== //
    // PROFILE PAGE
    $('#sidenavProfile').on('click', function () {
        // Hide the feed and post form
        $('#feedContent').addClass('d-none');
        $('#postForm').addClass('d-none');
        $('#feed').addClass('d-none');
        $('#userProfilePage').addClass('d-none');
        $('#editProfileContainer').addClass('d-none');

        // Show the profile page
        $('#profilePage').removeClass('d-none');
    });
    // NEWSFEED PAGE
    $('#sidenavFeed').on('click', function () {
        $('#profilePage').addClass('d-none');
        $('#userProfilePage').addClass('d-none');
        // Show the feed and post form
        $('#feedContent').removeClass('d-none');
        $('#postForm').removeClass('d-none');
        $('#feed').removeClass('d-none');
    });

    $('#view-profile').on('click', function () {
        $('#profilePage').addClass('d-none');
        $('#postForm').addClass('d-none');
        $('#userProfilePage').removeClass('d-none');
    })

    // ============================================================= //
    // ===== OTHER FUNCTIONS ===== //   
    // Switch forms function
    function switchForms(fromContainer, toContainer) {
        fromContainer.fadeOut(500, function () {
            fromContainer.addClass('d-none').css('display', 'none');
            toContainer.removeClass('d-none').css({ 'display': 'block', 'opacity': 0 })
                .animate({ 'opacity': 1 }, 500, function () {
                    toContainer.css('opacity', 1);
                });
        });
    }

    // Toggle password visibility function
    function togglePasswordVisibility(passwordField) {
        const type = passwordField.attr("type") === "password" ? "text" : "password";
        passwordField.attr("type", type);
        passwordField.siblings("i").toggleClass("fa-eye fa-eye-slash");
    }

    // Loading spinner button
    function toggleLoading(isLoading) {
        const loadingButtonRegister = $("#loadSignup");
        const loadingButtonLogin = $("#loadLogin");
        const signUpButton = $("#signUp");
        const loginButton = $("#login");

        if (isLoading) {
            loadingButtonRegister.removeClass("d-none");
            loadingButtonLogin.removeClass("d-none");
            signUpButton.addClass("d-none");
            loginButton.addClass("d-none");
        } else {
            loadingButtonRegister.addClass("d-none");
            loadingButtonLogin.addClass("d-none");
            signUpButton.removeClass("d-none");
            loginButton.removeClass("d-none");
        }
    }

    $('#editProfile').click(function () {
        $('#editProfileContainer').removeClass('d-none');
        $('#profilePage').addClass('d-none');
        $('#feed').addClass('d-none');
    });

});
