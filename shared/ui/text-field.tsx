'use client';

import { Input, type InputProps } from './input';
import styles from './text-field.module.css';

export function TextField(props: InputProps) {
  return <Input {...props} classNames={{ ...styles, ...props.classNames }} />;
}
