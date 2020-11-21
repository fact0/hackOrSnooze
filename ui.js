$(async function () {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $("#all-articles-list");
	const $submitForm = $("#submit-form");
	const $filteredArticles = $("#filtered-articles");
	const $loginForm = $("#login-form");
	const $createAccountForm = $("#create-account-form");
	const $ownStories = $("#my-articles");
	const $navLogin = $("#nav-login");
	const $navLogOut = $("#nav-logout");
	const $navMainLinks = $(".main-nav-links");
	const $navSubmitStory = $("#nav-submit-story");
	const $navFavorites = $("#nav-favorites");
	const $navMyStories = $("#nav-my-stories");
	const $navUserProfile = $("#nav-user-profile");
	const $favoritedArticles = $("#favorited-articles");
	const $userProfile = $("#user-profile");

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();

	/**
	 * Event listener for logging in.
	 *  If successfully we will setup the user instance
	 */

	$loginForm.on("submit", async function (evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $("#login-username").val();
		const password = $("#login-password").val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Event listener for signing up.
	 *  If successfully we will setup a new user instance
	 */

	$createAccountForm.on("submit", async function (evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $("#create-account-name").val();
		let username = $("#create-account-username").val();
		let password = $("#create-account-password").val();

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/** Show story submit form on clicking story "submit" */
	$navSubmitStory.on("click", function () {
		hideElements();
		$allStoriesList.show();
		$submitForm.show();
	});

	/** Show favorites form on clicking "favorite" */
	$navFavorites.on("click", function () {
		hideElements();
		showFavorites();
	});

	/** Show my stories form on clicking "my stories" */
	$navMyStories.on("click", function () {
		hideElements();
		showUserStories();
	});

	/**
	 * Log Out Functionality
	 */

	$navLogOut.on("click", function () {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
	 * Event Handler for Clicking Login
	 */

	$navLogin.on("click", function () {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	// show user profile on click
	$navUserProfile.on("click", function () {
		hideElements();
		$userProfile.show();
	});

	/**
	 * Event handler for Navigation to Homepage
	 */

	$("body").on("click", "#nav-all", async function () {
		hideElements();
		await generateStories();
		$allStoriesList.show();
	});

	/**
	 * On page load, checks local storage to see if the user is already logged in.
	 * Renders page information accordingly.
	 */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem("token");
		const username = localStorage.getItem("username");

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			generateProfile();
			showNavForLoggedInUser();
		}
	}

	/**
	 * Build a user profile based on the global "user" instance
	 */

	function generateProfile() {
		// show your name
		$("#profile-name").text(`Name: ${currentUser.name}`);
		// show your username
		$("#profile-username").text(`Username: ${currentUser.username}`);
		// format and display the account creation date
		$("#profile-account-date").text(
			`Account Created: ${currentUser.createdAt.slice(0, 10)}`
		);
		// set the navigation to list the username
		$navUserProfile.text(`${currentUser.username}`);
	}
	/**
	 * A rendering function to run to reset the forms and hide the login info
	 */

	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger("reset");
		$createAccountForm.trigger("reset");

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();
	}

	/**
	 * A rendering function to call the StoryList.getStories static method,
	 *  which will generate a storyListInstance. Then render it.
	 */

	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}

	// Adds new story on story form sumbit:
	async function submitStory(e) {
		e.preventDefault();

		// grab all info from form
		const title = $("#title").val();
		const url = $("#url").val();
		const author = $("#author").val();
		const username = currentUser.username;
		const storyData = { title, url, author, username };

		const story = await storyList.addStory(currentUser, storyData);

		const $story = generateStoryHTML(story);
		$allStoriesList.prepend($story);

		// hide the form and reset it
		$submitForm.slideUp("slow");
		$submitForm.trigger("reset");
	}
	$submitForm.on("submit", submitStory);

	// generates favorites page:
	function showFavorites() {
		$ownStories.empty();
		$favoritedArticles.empty();

		if (currentUser.favorites.length === 0) {
			$favoritedArticles.append("<h5>No favorites added!</h5>");
		} else {
			// loop through all of users favorites and generate HTML for them
			for (let story of currentUser.favorites) {
				const $story = generateStoryHTML(story);
				$favoritedArticles.append($story);
			}
		}

		$favoritedArticles.show();
	}

	/******************************************************************************
	 * Functionality for list of user's own stories
	 */

	function showUserStories() {
		$favoritedArticles.empty();
		$ownStories.empty();

		if (currentUser.ownStories.length === 0) {
			$ownStories.append("<h5>No stories added by user yet!</h5>");
		} else {
			// loop through all of users stories and generate HTML for them
			for (let story of currentUser.ownStories) {
				let $story = generateStoryHTML(story, true);
				$ownStories.append($story);
			}
		}

		$ownStories.show();
	}

	/**
	 * A function to render HTML for an individual Story instance
	 */

	function generateStoryHTML(story, showDeleteBtn = false) {
		let hostName = getHostName(story.url);
		const showStar = Boolean(currentUser);
		// render story markup
		const storyMarkup = $(`
	  <li id="${story.storyId}">
	  ${showDeleteBtn ? getDeleteBtnHTML() : ""}
	  ${showStar ? getStarHTML(story, currentUser) : ""}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

		return storyMarkup;
	}

	/** Make delete button HTML for story */

	function getDeleteBtnHTML() {
		return `
		<span class="trash-can">
		  <i class="fas fa-trash-alt"></i>
		</span>`;
	}

	/** Make favorite/not-favorite star for story */

	function getStarHTML(story, user) {
		const isFavorite = user.isFavorite(story);
		const starType = isFavorite ? "fas" : "far";
		return `
		<span class="star">
		  <i class="${starType} fa-star"></i>
		</span>`;
	}

	/** Handle favorite/un-favorite a story */

	async function toggleStoryFavorite(e) {
		const $tgt = $(e.target);
		const $closestLi = $tgt.closest("li");
		const storyId = $closestLi.attr("id");
		const story = storyList.stories.find((s) => s.storyId === storyId);

		// see if the item is already favorited (checking by presence of star)
		if ($tgt.hasClass("fas")) {
			// currently a favorite: remove from user's fav list and change star
			await currentUser.removeFavorite(story);
			$tgt.closest("i").toggleClass("fas far");
		} else {
			// currently not a favorite: do the opposite
			await currentUser.addFavorite(story);
			$tgt.closest("i").toggleClass("fas far");
		}
	}

	// toggle favorite on click, works on fav articles screen:
	$allStoriesList.on("click", ".star", toggleStoryFavorite);
	$favoritedArticles.on("click", ".star", toggleStoryFavorite);

	// deletes a story
	async function deleteStory(e) {
		const $closestLi = $(e.target).closest("li");
		const storyId = $closestLi.attr("id");

		await storyList.removeStory(currentUser, storyId);

		// re-generate story list
		await showUserStories();
	}

	$ownStories.on("click", ".trash-can", deleteStory);

	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$ownStories,
			$loginForm,
			$createAccountForm,
			$userProfile,
		];
		elementsArr.forEach(($elem) => $elem.hide());
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$navLogOut.show();
		$navMainLinks.show();
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf("://") > -1) {
			hostName = url.split("/")[2];
		} else {
			hostName = url.split("/")[0];
		}
		if (hostName.slice(0, 4) === "www.") {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem("token", currentUser.loginToken);
			localStorage.setItem("username", currentUser.username);
		}
	}
});
