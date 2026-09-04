import React from 'react';
import AcademicSetup from './components/admin/AcademicSetup';

/**
 * AdminAcademicManager delegates to the standardized AcademicSetup component.
 */
export default function AdminAcademicManager(props) {
  return <AcademicSetup {...props} />;
}
