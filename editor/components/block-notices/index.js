/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { NoticeList } from '@wordpress/components';

/**
 * Internal dependencies
 */
import './style.scss';

export default function BlockNotices( { className, ...props } ) {
	return (
		<NoticeList
			className={ classnames( 'block-notices', className ) }
			{ ...props }
		/>
	);
}
