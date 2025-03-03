from flask import Flask, render_template, request, jsonify
import pandas as pd
import io
import json
import re
from datetime import datetime

app = Flask(__name__)

def identify_column_types(df):
    column_types = {}
    
    for column in df.columns:
        # Check if all values are numeric
        if pd.to_numeric(df[column], errors='coerce').notna().all():
            column_types[column] = 'N'  # Numeric
        # Check if all values are dates
        elif is_date_column(df[column]):
            column_types[column] = 'D'  # Date
        # Check if column has mixed text and numbers
        elif has_text_and_numbers(df[column]):
            column_types[column] = 'TN'  # Text + Numeric
        # Default to Text
        else:
            column_types[column] = 'T'  # Text
    
    return column_types

def is_date_column(column):
    # First test if the column is already a datetime type
    if pd.api.types.is_datetime64_any_dtype(column):
        return True
        
    # Try common formats with explicit format specification
    date_formats = [
        '%Y-%m-%d',          # 2023-01-31
        '%d/%m/%Y',          # 31/01/2023
        '%m/%d/%Y',          # 01/31/2023
        '%Y/%m/%d',          # 2023/01/31
        '%d-%m-%Y',          # 31-01-2023
        '%m-%d-%Y',          # 01-31-2023
        '%B %d, %Y',         # January 31, 2023
        '%d %B %Y',          # 31 January 2023
        '%Y-%m-%d %H:%M:%S'  # 2023-01-31 14:30:00
    ]
    
    # Try each format explicitly
    for date_format in date_formats:
        try:
            pd.to_datetime(column, format=date_format, errors='raise')
            return True
        except ValueError:
            continue
    
    # If all explicit formats fail, try a more permissive approach
    # but only on a small sample to reduce processing time
    sample_size = min(10, len(column))
    try:
        # Use without the deprecated parameter
        pd.to_datetime(column.sample(sample_size), errors='raise')
        return True
    except:
        return False

def has_text_and_numbers(column):
    has_text = False
    has_numbers = False
    
    # Convert column to string if it's not already
    column = column.astype(str)
    
    # Check if there are text values
    has_text = any(re.search('[a-zA-Z]', str(value)) for value in column)
    
    # Check if there are numeric values
    has_numbers = any(re.search(r'\d', str(value)) for value in column)
    
    return has_text and has_numbers

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    if file and (file.filename.endswith('.xlsx') or file.filename.endswith('.csv')):
        try:
            if file.filename.endswith('.xlsx'):
                df = pd.read_excel(file)
            else:
                df = pd.read_csv(file)
            
            column_types = identify_column_types(df)
            
            # Convert DataFrame to JSON for JavaScript
            data_json = df.to_json(orient='records')
            
            return jsonify({
                'success': True,
                'columns': list(df.columns),
                'column_types': column_types,
                'data': json.loads(data_json),
                'message': 'File successfully processed'
            })
        except Exception as e:
            return jsonify({'error': str(e)})
    
    return jsonify({'error': 'File type not supported. Please upload .xlsx or .csv files.'})

if __name__ == '__main__':
    app.run(debug=True)