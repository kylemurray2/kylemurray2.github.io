import os
import re

def format_text_content(text):
    # Remove extra spaces
    text = re.sub(r' +', ' ', text)
    # Remove extra newlines (preserving paragraph breaks)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    # Replace single newlines with spaces
    text = re.sub(r'([^\n])\n([^\n])', r'\1 \2', text)
    # Clean up any repeated spaces from previous operations
    text = re.sub(r' +', ' ', text)
    # Ensure there's only one newline at the end of the file
    text = text.strip() + '\n'
    return text

def process_directory(dir_path):
    count = 0
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.txt'):
                file_path = os.path.join(root, file)
                try:
                    # Read the file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Format the content
                    formatted_content = format_text_content(content)
                    
                    # Write back the formatted content
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(formatted_content)
                    
                    count += 1
                    print(f"Formatted: {file_path}")
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")
    
    return count

if __name__ == "__main__":
    research_dirs = ["tectonics", "flooding", "groundwater", "insar"]
    total_files = 0
    
    for dir_name in research_dirs:
        print(f"\nProcessing {dir_name} directory...")
        files_processed = process_directory(dir_name)
        total_files += files_processed
        print(f"Completed {dir_name}: {files_processed} files processed")
    
    print(f"\nTotal .txt files formatted: {total_files}") 