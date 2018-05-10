/**
 * External dependencies
 */
import { parse } from 'url';
import { includes, kebabCase, toLower } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { Component, compose, Fragment, renderToString } from '@wordpress/element';
import { Button, Placeholder, Spinner, SandBox } from '@wordpress/components';
import { createBlock } from '@wordpress/blocks';
import { withSelect } from '@wordpress/data';
import {
	BlockControls,
	BlockAlignmentToolbar,
	RichText,
} from '@wordpress/editor';

/**
 * Internal dependencies
 */
import './style.scss';
import './editor.scss';

// These embeds do not work in sandboxes
const HOSTS_NO_PREVIEWS = [ 'facebook.com' ];

const matchesPatterns = ( url, patterns = [] ) => {
	return patterns.some( ( pattern ) => {
		return url.match( pattern );
	} );
};

const findBlock = ( url ) => {
	for ( const block of [ ...common, ...others ] ) {
		if ( matchesPatterns( url, block.patterns ) ) {
			return block.name;
		}
	}
	return 'core/embed';
};

function getEmbedBlockSettings( { title, description, icon, category = 'embed', transforms, keywords = [] } ) {
	// translators: %s: Name of service (e.g. VideoPress, YouTube)
	const blockDescription = description || sprintf( __( 'Add a block that displays content pulled from other sites, like Twitter, Instagram or YouTube.' ), title );
	return {
		title,
		description: blockDescription,
		icon,
		category,
		keywords,
		attributes: {
			url: {
				type: 'string',
			},
			caption: {
				type: 'array',
				source: 'children',
				selector: 'figcaption',
				default: [],
			},
			align: {
				type: 'string',
			},
			type: {
				type: 'string',
			},
			providerNameSlug: {
				type: 'string',
			},
		},

		transforms,

		getEditWrapperProps( attributes ) {
			const { align } = attributes;
			if ( 'left' === align || 'right' === align || 'wide' === align || 'full' === align ) {
				return { 'data-align': align };
			}
		},

		edit: compose(
			withSelect( ( select, ownProps ) => {
				const { url } = ownProps.attributes;
				// Preview is undefined if we don't know the status of it, false if it failed,
				// otherwise it will be an object containing the embed response.
				const preview = url ? select( 'core/blocks' ).getPreview( url ) : undefined;
				return {
					preview,
				};
			} )
		)( class extends Component {
			constructor() {
				super( ...arguments );
				this.setUrl = this.setUrl.bind( this );
				this.processPreview = this.processPreview.bind( this );
				this.state = {
					html: '',
					type: '',
					error: false,
					fetching: false,
					providerName: '',
					url: '',
				};
			}

			componentWillMount() {
				if ( this.props.attributes.url ) {
					// Loading from a saved block, set the state up and display the fetching UI.
					this.setState( { fetching: true, url: this.props.attributes.url } );
					if ( this.props.preview ) {
						// Preview must have already been fetched prior to loading this block, so process it.
						this.processPreview( this.props.preview, this.props.attributes.url );
					}
				}
			}

			componentWillUnmount() {
				// can't abort the fetch promise, so let it know we will unmount
				this.unmounting = true;
			}

			componentWillReceiveProps( nextProps ) {
				const hasPreview = undefined !== nextProps.preview;
				if ( hasPreview ) {
					this.processPreview( nextProps.preview, nextProps.attributes.url );
				}
			}

			getPhotoHtml( photo ) {
				// 100% width for the preview so it fits nicely into the document, some "thumbnails" are
				// acually the full size photo.
				const photoPreview = <p><img src={ photo.thumbnail_url } alt={ photo.title } width="100%" /></p>;
				return renderToString( photoPreview );
			}

			setUrl( event ) {
				if ( event ) {
					event.preventDefault();
				}
				const { url } = this.state;
				const { setAttributes } = this.props;
				if ( url === this.props.attributes.url ) {
					// Don't change anything, otherwise we go into the 'fetching' state but never
					// get new props, because the url has not changed.
					return;
				}
				setAttributes( { url } );
				this.setState( { fetching: true, error: false } );
			}

			processPreview( obj, url ) {
				const { setAttributes } = this.props;

				if ( false === obj ) {
					// If the preview is false (not falsey, but actually false) then the embed request failed,
					// so we cannot embed it.
					this.setState( { fetching: false, error: true } );
					return;
				}

				if ( undefined === url ) {
					return;
				}

				const matchingBlock = findBlock( url );

				// WordPress blocks can work on multiple sites, and so don't have patterns,
				// so if we're in a WordPress block, assume the user has chosen it for a WordPress URL.
				if ( 'core-embed/wordpress' !== this.props.name && 'core/embed' !== matchingBlock ) {
					// At this point, we have discovered a more suitable block for this url, so transform it.
					if ( this.props.name !== matchingBlock ) {
						this.props.onReplace( createBlock( matchingBlock, { url } ) );
						return;
					}
				}

				// Some plugins only return HTML with no type info, so default this to 'rich'.
				let { type = 'rich' } = obj;
				// If we got a provider name from the API, use it for the slug, otherwise we use the title,
				// because not all embed code gives us a provider name.
				const { html, provider_name: providerName } = obj;
				const providerNameSlug = kebabCase( toLower( '' !== providerName ? providerName : title ) );

				// This indicates it's a WordPress embed, there aren't a set of URL patterns we can use to match WordPress URLs.
				if ( includes( html, 'class="wp-embedded-content" data-secret' ) ) {
					type = 'wp-embed';
					// If this is not the WordPress embed block, transform it into one.
					if ( this.props.name !== 'core-embed/wordpress' ) {
						this.props.onReplace( createBlock( 'core-embed/wordpress', { url } ) );
						return;
					}
				}

				if ( html ) {
					this.setState( { html, type, providerNameSlug } );
					setAttributes( { type, providerNameSlug } );
				} else if ( 'photo' === type ) {
					this.setState( { html: this.getPhotoHtml( obj ), type, providerNameSlug } );
					setAttributes( { type, providerNameSlug } );
				}
				this.setState( { fetching: false } );
			}

			render() {
				const { html, type, error, fetching, url } = this.state;
				const { align, caption } = this.props.attributes;
				const { setAttributes, isSelected, className } = this.props;
				const updateAlignment = ( nextAlign ) => setAttributes( { align: nextAlign } );

				const controls = (
					<BlockControls>
						<BlockAlignmentToolbar
							value={ align }
							onChange={ updateAlignment }
						/>
					</BlockControls>
				);

				if ( fetching ) {
					return (
						<Fragment>
							{ controls }
							<div className="wp-block-embed is-loading">
								<Spinner />
								<p>{ __( 'Embedding…' ) }</p>
							</div>
						</Fragment>
					);
				}

				if ( ! html ) {
					const label = sprintf( __( '%s URL' ), title );

					return (
						<Fragment>
							{ controls }
							<Placeholder icon={ icon } label={ label } className="wp-block-embed">
								<form onSubmit={ this.setUrl }>
									<input
										type="url"
										value={ url || '' }
										className="components-placeholder__input"
										aria-label={ label }
										placeholder={ __( 'Enter URL to embed here…' ) }
										onChange={ ( event ) => this.setState( { url: event.target.value } ) } />
									<Button
										isLarge
										type="submit">
										{ __( 'Embed' ) }
									</Button>
									{ error && <p className="components-placeholder__error">{ __( 'Sorry, we could not embed that content.' ) }</p> }
								</form>
							</Placeholder>
						</Fragment>
					);
				}

				const parsedUrl = parse( url );
				const cannotPreview = includes( HOSTS_NO_PREVIEWS, parsedUrl.host.replace( /^www\./, '' ) );
				const iframeTitle = sprintf( __( 'Embedded content from %s' ), parsedUrl.host );
				const embedWrapper = 'wp-embed' === type ? (
					<div
						className="wp-block-embed__wrapper"
						dangerouslySetInnerHTML={ { __html: html } }
					/>
				) : (
					<div className="wp-block-embed__wrapper">
						<SandBox
							html={ html }
							title={ iframeTitle }
							type={ type }
						/>
					</div>
				);

				return (
					<Fragment>
						{ controls }
						<figure className={ classnames( className, { 'is-video': 'video' === type } ) }>
							{ ( cannotPreview ) ? (
								<Placeholder icon={ icon } label={ __( 'Embed URL' ) }>
									<p className="components-placeholder__error"><a href={ url }>{ url }</a></p>
									<p className="components-placeholder__error">{ __( 'Previews for this are unavailable in the editor, sorry!' ) }</p>
								</Placeholder>
							) : embedWrapper }
							{ ( caption && caption.length > 0 ) || isSelected ? (
								<RichText
									tagName="figcaption"
									placeholder={ __( 'Write caption…' ) }
									value={ caption }
									onChange={ ( value ) => setAttributes( { caption: value } ) }
									inlineToolbar
								/>
							) : null }
						</figure>
					</Fragment>
				);
			}
		} ),

		save( { attributes } ) {
			const { url, caption, align, type, providerNameSlug } = attributes;

			if ( ! url ) {
				return null;
			}

			const embedClassName = classnames( 'wp-block-embed', {
				[ `align${ align }` ]: align,
				[ `is-type-${ type }` ]: type,
				[ `is-provider-${ providerNameSlug }` ]: providerNameSlug,
			} );

			return (
				<figure className={ embedClassName }>
					{ `\n${ url }\n` /* URL needs to be on its own line. */ }
					{ caption && caption.length > 0 && <RichText.Content tagName="figcaption" value={ caption } /> }
				</figure>
			);
		},
	};
}

export const name = 'core/embed';

export const settings = getEmbedBlockSettings( {
	title: __( 'Embed' ),
	description: __( 'The Embed block allows you to easily add videos, images, tweets, audio, and other content to your post or page.' ),
	icon: 'embed-generic',
	transforms: {
		from: [
			{
				type: 'raw',
				isMatch: ( node ) => node.nodeName === 'P' && /^\s*(https?:\/\/\S+)\s*$/i.test( node.textContent ),
				transform: ( node ) => {
					return createBlock( 'core/embed', {
						url: node.textContent.trim(),
					} );
				},
			},
		],
	},
} );

export const common = [
	{
		name: 'core-embed/twitter',
		settings: getEmbedBlockSettings( {
			title: 'Twitter',
			icon: 'embed-post',
			keywords: [ __( 'tweet' ) ],
		} ),
		patterns: [ /^https?:\/\/(www\.)?twitter\.com\/.+/i ],
	},
	{
		name: 'core-embed/youtube',
		settings: getEmbedBlockSettings( {
			title: 'YouTube',
			icon: 'embed-video',
			keywords: [ __( 'music' ), __( 'video' ) ],
		} ),
		patterns: [ /^https?:\/\/((m|www)\.)?youtube\.com\/.+/i, /^https?:\/\/youtu\.be\/.+/i ],
	},
	{
		name: 'core-embed/facebook',
		settings: getEmbedBlockSettings( {
			title: 'Facebook',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/www\.facebook.com\/.+/i ],
	},
	{
		name: 'core-embed/instagram',
		settings: getEmbedBlockSettings( {
			title: 'Instagram',
			icon: 'embed-photo',
			keywords: [ __( 'image' ) ],
		} ),
		patterns: [ /^https?:\/\/(www\.)?instagr(\.am|am\.com)\/.+/i ],
	},
	{
		name: 'core-embed/wordpress',
		settings: getEmbedBlockSettings( {
			title: 'WordPress',
			icon: 'embed-post',
			keywords: [ __( 'post' ), __( 'blog' ) ],
		} ),
	},
	{
		name: 'core-embed/soundcloud',
		settings: getEmbedBlockSettings( {
			title: 'SoundCloud',
			icon: 'embed-audio',
			keywords: [ __( 'music' ), __( 'audio' ) ],
		} ),
		patterns: [ /^https?:\/\/(www\.)?soundcloud\.com\/.+/i ],
	},
	{
		name: 'core-embed/spotify',
		settings: getEmbedBlockSettings( {
			title: 'Spotify',
			icon: 'embed-audio',
			keywords: [ __( 'music' ), __( 'audio' ) ],
		} ),
		patterns: [ /^https?:\/\/(open|play)\.spotify\.com\/.+/i ],
	},
	{
		name: 'core-embed/flickr',
		settings: getEmbedBlockSettings( {
			title: 'Flickr',
			icon: 'embed-photo',
			keywords: [ __( 'image' ) ],
		} ),
		patterns: [ /^https?:\/\/(www\.)?flickr\.com\/.+/i, /^https?:\/\/flic\.kr\/.+/i ],
	},
	{
		name: 'core-embed/vimeo',
		settings: getEmbedBlockSettings( {
			title: 'Vimeo',
			icon: 'embed-video',
			keywords: [ __( 'video' ) ],
		} ),
		patterns: [ /^https?:\/\/(www\.)?vimeo\.com\/.+/i ],
	},
];

export const others = [
	{
		name: 'core-embed/animoto',
		settings: getEmbedBlockSettings( {
			title: 'Animoto',
			icon: 'embed-video',
		} ),
		patterns: [ /^https?:\/\/(www\.)?(animoto|video214)\.com\/.+/i ],
	},
	{
		name: 'core-embed/cloudup',
		settings: getEmbedBlockSettings( {
			title: 'Cloudup',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/cloudup\.com\/.+/i ],
	},
	{
		name: 'core-embed/collegehumor',
		settings: getEmbedBlockSettings( {
			title: 'CollegeHumor',
			icon: 'embed-video',
		} ),
		patterns: [ /^https?:\/\/(www\.)?collegehumor\.com\/.+/i ],
	},
	{
		name: 'core-embed/dailymotion',
		settings: getEmbedBlockSettings( {
			title: 'Dailymotion',
			icon: 'embed-video',
		} ),
		patterns: [ /^https?:\/\/(www\.)?dailymotion\.com\/.+/i ],
	},
	{
		name: 'core-embed/funnyordie',
		settings: getEmbedBlockSettings( {
			title: 'Funny or Die',
			icon: 'embed-video',
		} ),
		patterns: [ /^https?:\/\/(www\.)?funnyordie\.com\/.+/i ],
	},
	{
		name: 'core-embed/hulu',
		settings: getEmbedBlockSettings( {
			title: 'Hulu',
			icon: 'embed-video',
		} ),
		patterns: [ /^https?:\/\/(www\.)?hulu\.com\/.+/i ],
	},
	{
		name: 'core-embed/imgur',
		settings: getEmbedBlockSettings( {
			title: 'Imgur',
			icon: 'embed-photo',
		} ),
		patterns: [ /^https?:\/\/(.+\.)?imgur\.com\/.+/i ],
	},
	{
		name: 'core-embed/issuu',
		settings: getEmbedBlockSettings( {
			title: 'Issuu',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/(www\.)?issuu\.com\/.+/i ],
	},
	{
		name: 'core-embed/kickstarter',
		settings: getEmbedBlockSettings( {
			title: 'Kickstarter',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/(www\.)?kickstarter\.com\/.+/i, /^https?:\/\/kck\.st\/.+/i ],
	},
	{
		name: 'core-embed/meetup-com',
		settings: getEmbedBlockSettings( {
			title: 'Meetup.com',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/(www\.)?meetu(\.ps|p\.com)\/.+/i ],
	},
	{
		name: 'core-embed/mixcloud',
		settings: getEmbedBlockSettings( {
			title: 'Mixcloud',
			icon: 'embed-audio',
			keywords: [ __( 'music' ), __( 'audio' ) ],
		} ),
		patterns: [ /^https?:\/\/(www\.)?mixcloud\.com\/.+/i ],
	},
	{
		name: 'core-embed/photobucket',
		settings: getEmbedBlockSettings( {
			title: 'Photobucket',
			icon: 'embed-photo',
		} ),
		patterns: [ /^http:\/\/g?i*\.photobucket\.com\/.+/i ],
	},
	{
		name: 'core-embed/polldaddy',
		settings: getEmbedBlockSettings( {
			title: 'Polldaddy',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/(www\.)?mixcloud\.com\/.+/i ],
	},
	{
		name: 'core-embed/reddit',
		settings: getEmbedBlockSettings( {
			title: 'Reddit',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/(www\.)?reddit\.com\/.+/i ],
	},
	{
		name: 'core-embed/reverbnation',
		settings: getEmbedBlockSettings( {
			title: 'ReverbNation',
			icon: 'embed-audio',
		} ),
		patterns: [ /^https?:\/\/(www\.)?reverbnation\.com\/.+/i ],
	},
	{
		name: 'core-embed/screencast',
		settings: getEmbedBlockSettings( {
			title: 'Screencast',
			icon: 'embed-video',
		} ),
		patterns: [ /^https?:\/\/(www\.)?screencast\.com\/.+/i ],
	},
	{
		name: 'core-embed/scribd',
		settings: getEmbedBlockSettings( {
			title: 'Scribd',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/(www\.)?scribd\.com\/.+/i ],
	},
	{
		name: 'core-embed/slideshare',
		settings: getEmbedBlockSettings( {
			title: 'Slideshare',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/(.+?\.)?slideshare\.net\/.+/i ],
	},
	{
		name: 'core-embed/smugmug',
		settings: getEmbedBlockSettings( {
			title: 'SmugMug',
			icon: 'embed-photo',
		} ),
		patterns: [ /^https?:\/\/(www\.)?smugmug\.com\/.+/i ],
	},
	{
		name: 'core-embed/speaker',
		settings: getEmbedBlockSettings( {
			title: 'Speaker',
			icon: 'embed-audio',
		} ),
		patterns: [ /^https?:\/\/(www\.)?speakerdeck\.com\/.+/i ],
	},
	{
		name: 'core-embed/ted',
		settings: getEmbedBlockSettings( {
			title: 'TED',
			icon: 'embed-video',
		} ),
		patterns: [ /^https?:\/\/(www\.|embed\.)?ted\.com\/.+/i ],
	},
	{
		name: 'core-embed/tumblr',
		settings: getEmbedBlockSettings( {
			title: 'Tumblr',
			icon: 'embed-post',
		} ),
		patterns: [ /^https?:\/\/(www\.)?tumblr\.com\/.+/i ],
	},
	{
		name: 'core-embed/videopress',
		settings: getEmbedBlockSettings( {
			title: 'VideoPress',
			icon: 'embed-video',
			keywords: [ __( 'video' ) ],
		} ),
		patterns: [ /^https?:\/\/videopress\.com\/.+/i ],
	},
	{
		name: 'core-embed/wordpress-tv',
		settings: getEmbedBlockSettings( {
			title: 'WordPress.tv',
			icon: 'embed-video',
		} ),
		patterns: [ /^https?:\/\/wordpress\.tv\/.+/i ],
	},
];
