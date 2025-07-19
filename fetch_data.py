import requests
from bs4 import BeautifulSoup
import pandas as pd

# URL to query
url = "https://landregistry.data.gov.uk/app/ukhpi/browse?from=2023-02-01&location=http%3A%2F%2Flandregistry.data.gov.uk%2Fid%2Fregion%2Fnorth-east&to=2025-07-09&lang=en"

# Send a GET request to the URL
response = requests.get(url)

# Check if request was successful
if response.status_code == 200:
    # Parse HTML content
    soup = BeautifulSoup(response.content, "html.parser")

    # Find the table
    table = soup.find("table")

    # Extract table data into a list of lists
    table_data = []
    for row in table.find_all("tr"):
        row_data = []
        for cell in row.find_all(["th", "td"]):
            row_data.append(cell.get_text(strip=True))
        table_data.append(row_data)

    # Convert table data to a DataFrame
    df = pd.DataFrame(table_data[1:], columns=table_data[0])

    # Display DataFrame
    print(df)

else:
    print("Failed to retrieve data. Status code:", response.status_code)
