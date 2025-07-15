# Implementation Plan

- [ ] 1. Enhance file upload validation and error handling

  - Extend the existing parse-broker-file route to include comprehensive file validation
  - Add file size limits (10MB), format validation, and detailed error responses
  - Implement proper error messages for unsupported formats and oversized files
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Create broker detection service

  - Implement BrokerDetectionService class with pattern matching for XTB, Binance, and Coinbase
  - Create broker pattern configurations with regex patterns and required columns
  - Add CSV structure analysis for header detection
  - Write unit tests for broker detection accuracy
  - _Requirements: 2.1, 2.3, 7.1, 7.3_

- [ ] 3. Enhance transaction parsing with broker-specific prompts

  - Modify the existing LLM parsing logic to use broker-specific prompts
  - Extend the parsing schema to include confidence scores and raw data
  - Implement error collection and summary generation during parsing
  - Add validation for parsed transaction data
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Implement duplicate detection service

  - Create DuplicateDetectionService to compare new transactions with existing portfolio transactions
  - Implement matching algorithm based on date, symbol, quantity, and price
  - Add confidence scoring for duplicate matches
  - Write unit tests for duplicate detection accuracy
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5. Create transaction review interface components

  - Build TransactionReviewTable component to display parsed transactions
  - Implement TransactionEditDialog for individual transaction editing
  - Create DuplicateHandlingInterface for managing duplicate transactions
  - Add progress indicators and error display components
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3_

- [ ] 6. Integrate broker detection into parsing workflow

  - Update the parse-broker-file route to include broker detection step
  - Add broker confirmation display in the response
  - Implement fallback error handling when broker cannot be detected
  - Test integration with existing Tika content extraction
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 7. Implement transaction import service with duplicate handling

  - Create TransactionImportService to handle validated transaction creation
  - Add batch transaction creation with rollback on partial failures
  - Implement duplicate resolution logic (skip, merge, import as separate)
  - Add transaction import summary and success/failure reporting
  - _Requirements: 4.4, 5.2, 5.3, 5.4_

- [ ] 8. Add comprehensive error handling and user feedback

  - Implement detailed error messages for each failure scenario
  - Add retry mechanisms for transient failures
  - Create user-friendly error displays with actionable guidance
  - Add logging for debugging and monitoring
  - _Requirements: 3.2, 3.4, 6.3, 6.4_

- [ ] 9. Create frontend workflow for file upload and review

  - Build file upload component with drag-and-drop support
  - Implement progress tracking during file processing
  - Create workflow navigation between upload, review, and import steps
  - Add success confirmation and portfolio update notifications
  - _Requirements: 1.1, 6.1, 6.2, 6.4_

- [ ] 10. Write comprehensive tests for the complete workflow

  - Create unit tests for all service classes and utility functions
  - Implement integration tests for the complete upload-to-import workflow
  - Add test data files for each supported broker format
  - Create performance tests for large file processing
  - _Requirements: All requirements - testing coverage_

- [ ] 11. Update API route to support the complete workflow

  - Refactor the existing parse-broker-file route to support the new workflow
  - Add new endpoints for transaction review and import confirmation
  - Implement proper request/response schemas for each workflow step
  - Add API documentation and error response specifications
  - _Requirements: 1.4, 2.4, 4.4, 6.4_

- [ ] 12. Integrate all components and test end-to-end functionality
  - Wire together all services and components into the complete workflow
  - Test the full user journey from file upload to transaction import
  - Verify error handling and recovery scenarios work correctly
  - Ensure proper portfolio updates and transaction creation
  - _Requirements: All requirements - integration testing_
