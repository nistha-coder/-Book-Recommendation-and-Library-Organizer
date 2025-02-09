document.addEventListener("DOMContentLoaded", function () {
    // Selecting important elements from the DOM
    const searchBtn = document.getElementById("search-btn");
    const searchBar = document.getElementById("search-bar");
    const resultsContainer = document.getElementById("results-container");
    const toReadContainer = document.getElementById("to-read");
    const readingContainer = document.getElementById("reading");
    const completedContainer = document.getElementById("completed");
    const recommendationsContainer = document.getElementById("recommendations-container");
    const themeToggle = document.getElementById("theme-toggle");

    // Toggle between light and dark mode
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        themeToggle.textContent = document.body.classList.contains("dark-mode") ? "Toggle Light Mode" : "Toggle Dark Mode";
    });

    // Function to handle search operation
    function handleSearch() {
        const query = searchBar.value.trim();
        if (query !== "") {
            fetchBooks(query);
        }
    }

    // Search button click and Enter key event listener
    searchBtn.addEventListener("click", handleSearch);
    searchBar.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            handleSearch();
        }
    });

    // Fetch books from Google Books API
    function fetchBooks(query) {
        fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}`)
            .then(response => response.json())
            .then(data => {
                displayResults(data.items, resultsContainer);
            })
            .catch(error => console.error("Error fetching books:", error));
    }

    // Display fetched books in the results container
    function displayResults(books, container) {
        container.innerHTML = "";
        const displayedTitles = new Set();

        books.forEach(book => {
            const title = book.volumeInfo.title || "No Title";
            if (!displayedTitles.has(title)) {
                displayedTitles.add(title);

                const bookDiv = document.createElement("div");
                bookDiv.classList.add("book");

                const imgSrc = book.volumeInfo.imageLinks ? book.volumeInfo.imageLinks.thumbnail : "https://via.placeholder.com/100x150";
                const previewLink = book.volumeInfo.previewLink || "";
                const isPreviewAvailable = book.accessInfo?.viewability === "PARTIAL" || book.accessInfo?.viewability === "ALL_PAGES";

                bookDiv.innerHTML = `
                    <img src="${imgSrc}" alt="Book Cover">
                    <h3>${title}</h3>
                    <button class="add-btn" data-title="${title}" data-img="${imgSrc}" data-preview="${previewLink}" data-preview-available="${isPreviewAvailable}">Add to Library</button>
                    ${isPreviewAvailable ? `<a href="${previewLink}" target="_blank"><button class="read-btn">Read Book</button></a>` : `<p>No Preview Available</p>`}
                `;

                container.appendChild(bookDiv);
            }
        });

        // Add event listener to all "Add to Library" buttons
        document.querySelectorAll(".add-btn").forEach(button => {
            button.addEventListener("click", function () {
                const title = this.getAttribute("data-title");
                const imgSrc = this.getAttribute("data-img");
                const previewLink = this.getAttribute("data-preview");
                const isPreviewAvailable = this.getAttribute("data-preview-available") === "true";

                if (isBookInLibrary(title)) {
                    alert("Book is already added!");
                } else {
                    addToLibrary(title, imgSrc, "toRead", previewLink, isPreviewAvailable);
                }
            });
        });
    }

    // Add book to the library and store in localStorage
    function addToLibrary(title, imgSrc, category, previewLink, isPreviewAvailable) {
        let library = JSON.parse(localStorage.getItem("library")) || { toRead: [], reading: [], completed: [] };

        if (!library[category].some(book => book.title === title)) {
            library[category].push({ title, imgSrc, previewLink, isPreviewAvailable });
            localStorage.setItem("library", JSON.stringify(library));
            displayLibrary();
        }
    }

    // Check if a book is already in the library
    function isBookInLibrary(title) {
        let library = JSON.parse(localStorage.getItem("library")) || { toRead: [], reading: [], completed: [] };
        return library.toRead.some(book => book.title === title) || 
               library.reading.some(book => book.title === title) || 
               library.completed.some(book => book.title === title);
    }

    // Display books from localStorage in the respective categories
    function displayLibrary() {
        const categories = { toRead: toReadContainer, reading: readingContainer, completed: completedContainer };
        let library = JSON.parse(localStorage.getItem("library")) || { toRead: [], reading: [], completed: [] };

        Object.keys(categories).forEach(category => {
            categories[category].innerHTML = "";
            library[category].forEach(book => {
                const bookDiv = document.createElement("div");
                bookDiv.classList.add("book");

                bookDiv.innerHTML = `
                    <img src="${book.imgSrc}" alt="Book Cover">
                    <h3>${book.title}</h3>
                    ${category === "toRead" ? `<button class="move-btn" data-title="${book.title}" data-img="${book.imgSrc}" data-preview="${book.previewLink}" data-preview-available="${book.isPreviewAvailable}" data-from="toRead" data-to="reading">Move to Reading</button>` : ""}
                    ${category === "reading" ? `<button class="move-btn" data-title="${book.title}" data-img="${book.imgSrc}" data-preview="${book.previewLink}" data-preview-available="${book.isPreviewAvailable}" data-from="reading" data-to="completed">Mark as Completed</button>` : ""}
                    ${book.isPreviewAvailable ? `<a href="${book.previewLink}" target="_blank"><button class="read-btn">Read Book</button></a>` : `<p>No Preview Available</p>`}
                    <button class="remove-btn" data-title="${book.title}" data-category="${category}">Remove</button>
                `;

                categories[category].appendChild(bookDiv);
            });
        });

        // Bind event listeners to newly added buttons
        bindLibraryButtons();
    }

    // Attach event listeners to move and remove buttons
    function bindLibraryButtons() {
        document.querySelectorAll(".move-btn").forEach(button => {
            button.addEventListener("click", function () {
                const title = this.getAttribute("data-title");
                const imgSrc = this.getAttribute("data-img");
                const previewLink = this.getAttribute("data-preview");
                const isPreviewAvailable = this.getAttribute("data-preview-available") === "true";
                const fromCategory = this.getAttribute("data-from");
                const toCategory = this.getAttribute("data-to");
                moveBook(title, imgSrc, previewLink, isPreviewAvailable, fromCategory, toCategory);
            });
        });

        document.querySelectorAll(".remove-btn").forEach(button => {
            button.addEventListener("click", function () {
                const title = this.getAttribute("data-title");
                const category = this.getAttribute("data-category");
                removeFromLibrary(title, category);
            });
        });
    }

    // Move a book from one category to another
    function moveBook(title, imgSrc, previewLink, isPreviewAvailable, fromCategory, toCategory) {
        let library = JSON.parse(localStorage.getItem("library")) || { toRead: [], reading: [], completed: [] };

        // Remove from current category
        library[fromCategory] = library[fromCategory].filter(book => book.title !== title);

        // Add to the new category if not already present
        if (!library[toCategory].some(book => book.title === title)) {
            library[toCategory].push({ title, imgSrc, previewLink, isPreviewAvailable });
        }

        localStorage.setItem("library", JSON.stringify(library));
        displayLibrary();
    }

    // Remove a book from the library
    function removeFromLibrary(title, category) {
        let library = JSON.parse(localStorage.getItem("library")) || { toRead: [], reading: [], completed: [] };
        library[category] = library[category].filter(book => book.title !== title);
        localStorage.setItem("library", JSON.stringify(library));
        displayLibrary();
    }

    // Load famous books into recommendations section
    function loadFamousBooks() {
        fetch("https://www.googleapis.com/books/v1/volumes?q=bestsellers&maxResults=10")
            .then(response => response.json())
            .then(data => {
                displayResults(data.items, recommendationsContainer);
            })
            .catch(error => console.error("Error fetching famous books:", error));
    }

    // Load library and recommendations on page load
    displayLibrary();
    loadFamousBooks();
});
