using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "aspnetroles",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalizedname = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    concurrencystamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aspnetroles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "aspnetusers",
                columns: table => new
                {
                    id = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    isrestricted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    username = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalizedusername = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    normalizedemail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    emailconfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    passwordhash = table.Column<string>(type: "text", nullable: true),
                    securitystamp = table.Column<string>(type: "text", nullable: true),
                    concurrencystamp = table.Column<string>(type: "text", nullable: true),
                    phonenumber = table.Column<string>(type: "text", nullable: true),
                    phonenumberconfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    twofactorenabled = table.Column<bool>(type: "boolean", nullable: false),
                    lockoutend = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lockoutenabled = table.Column<bool>(type: "boolean", nullable: false),
                    accessfailedcount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aspnetusers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "badges",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_badges", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "buildings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_buildings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "aspnetroleclaims",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    roleid = table.Column<string>(type: "text", nullable: false),
                    claimtype = table.Column<string>(type: "text", nullable: true),
                    claimvalue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aspnetroleclaims", x => x.id);
                    table.ForeignKey(
                        name: "FK_aspnetroleclaims_aspnetroles_roleid",
                        column: x => x.roleid,
                        principalTable: "aspnetroles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "airequests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    requesttype = table.Column<string>(type: "text", nullable: false),
                    input = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_airequests", x => x.id);
                    table.ForeignKey(
                        name: "FK_airequests_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aspnetuserclaims",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<string>(type: "text", nullable: false),
                    claimtype = table.Column<string>(type: "text", nullable: true),
                    claimvalue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aspnetuserclaims", x => x.id);
                    table.ForeignKey(
                        name: "FK_aspnetuserclaims_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aspnetuserlogins",
                columns: table => new
                {
                    loginprovider = table.Column<string>(type: "text", nullable: false),
                    providerkey = table.Column<string>(type: "text", nullable: false),
                    providerdisplayname = table.Column<string>(type: "text", nullable: true),
                    userid = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aspnetuserlogins", x => new { x.loginprovider, x.providerkey });
                    table.ForeignKey(
                        name: "FK_aspnetuserlogins_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aspnetuserroles",
                columns: table => new
                {
                    userid = table.Column<string>(type: "text", nullable: false),
                    roleid = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aspnetuserroles", x => new { x.userid, x.roleid });
                    table.ForeignKey(
                        name: "FK_aspnetuserroles_aspnetroles_roleid",
                        column: x => x.roleid,
                        principalTable: "aspnetroles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_aspnetuserroles_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "aspnetusertokens",
                columns: table => new
                {
                    userid = table.Column<string>(type: "text", nullable: false),
                    loginprovider = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_aspnetusertokens", x => new { x.userid, x.loginprovider, x.name });
                    table.ForeignKey(
                        name: "FK_aspnetusertokens_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "auditlogs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: true),
                    action = table.Column<string>(type: "text", nullable: false),
                    details = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auditlogs", x => x.id);
                    table.ForeignKey(
                        name: "FK_auditlogs_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "chatconversations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chatconversations", x => x.id);
                    table.ForeignKey(
                        name: "FK_chatconversations_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "feedback",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    comment = table.Column<string>(type: "text", nullable: true),
                    rating = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feedback", x => x.id);
                    table.ForeignKey(
                        name: "FK_feedback_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    link = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<string>(type: "text", nullable: true),
                    isread = table.Column<bool>(type: "boolean", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_notifications_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reputations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    points = table.Column<int>(type: "integer", nullable: false),
                    level = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "New"),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reputations", x => x.id);
                    table.ForeignKey(
                        name: "FK_reputations_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "securityofficerrequests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    additionalinformation = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    submittedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reviewedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewedbyuserid = table.Column<string>(type: "text", nullable: true),
                    adminnotes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_securityofficerrequests", x => x.id);
                    table.ForeignKey(
                        name: "FK_securityofficerrequests_aspnetusers_reviewedbyuserid",
                        column: x => x.reviewedbyuserid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_securityofficerrequests_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "supportpayments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    provider = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    merchantinvoicenumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    providerpaymentid = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    providertransactionid = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    failurereasoncode = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    isverified = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supportpayments", x => x.id);
                    table.ForeignKey(
                        name: "FK_supportpayments_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "userprofiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    fullname = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    university = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    department = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    jobtitle = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    semester = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    studentid = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    bio = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    avatarurl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_userprofiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_userprofiles_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "floors",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    buildingid = table.Column<Guid>(type: "uuid", nullable: false),
                    floornumber = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    isactive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_floors", x => x.id);
                    table.ForeignKey(
                        name: "FK_floors_buildings_buildingid",
                        column: x => x.buildingid,
                        principalTable: "buildings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chathistories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    conversationid = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chathistories", x => x.id);
                    table.ForeignKey(
                        name: "FK_chathistories_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_chathistories_chatconversations_conversationid",
                        column: x => x.conversationid,
                        principalTable: "chatconversations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reputationhistories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    pointchange = table.Column<int>(type: "integer", nullable: false),
                    reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    relatedentitytype = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    relatedentityid = table.Column<Guid>(type: "uuid", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reputationid = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reputationhistories", x => x.id);
                    table.ForeignKey(
                        name: "FK_reputationhistories_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_reputationhistories_reputations_reputationid",
                        column: x => x.reputationid,
                        principalTable: "reputations",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "locations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    buildingid = table.Column<Guid>(type: "uuid", nullable: true),
                    floorid = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_locations", x => x.id);
                    table.ForeignKey(
                        name: "FK_locations_buildings_buildingid",
                        column: x => x.buildingid,
                        principalTable: "buildings",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_locations_floors_floorid",
                        column: x => x.floorid,
                        principalTable: "floors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "founditems",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    categoryid = table.Column<Guid>(type: "uuid", nullable: true),
                    locationid = table.Column<Guid>(type: "uuid", nullable: true),
                    locationdetails = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    privateverificationdetails = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    founderverificationanswersjson = table.Column<string>(type: "text", nullable: true),
                    foundat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Available"),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_founditems", x => x.id);
                    table.ForeignKey(
                        name: "FK_founditems_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_founditems_categories_categoryid",
                        column: x => x.categoryid,
                        principalTable: "categories",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_founditems_locations_locationid",
                        column: x => x.locationid,
                        principalTable: "locations",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "lostitems",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    userid = table.Column<string>(type: "text", nullable: false),
                    categoryid = table.Column<Guid>(type: "uuid", nullable: true),
                    locationid = table.Column<Guid>(type: "uuid", nullable: true),
                    locationdetails = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    lostat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lostitems", x => x.id);
                    table.ForeignKey(
                        name: "FK_lostitems_aspnetusers_userid",
                        column: x => x.userid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lostitems_categories_categoryid",
                        column: x => x.categoryid,
                        principalTable: "categories",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_lostitems_locations_locationid",
                        column: x => x.locationid,
                        principalTable: "locations",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "claims",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    founditemid = table.Column<Guid>(type: "uuid", nullable: false),
                    claimantuserid = table.Column<string>(type: "text", nullable: false),
                    claimantnotes = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reviewedbyuserid = table.Column<string>(type: "text", nullable: true),
                    reviewedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    decisionnotes = table.Column<string>(type: "text", nullable: true),
                    handedoverbyuserid = table.Column<string>(type: "text", nullable: true),
                    handedoverat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    handovernotes = table.Column<string>(type: "text", nullable: true),
                    handoverqrtoken = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    handoverqrcreatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    handoverqrusedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_claims", x => x.id);
                    table.ForeignKey(
                        name: "FK_claims_aspnetusers_claimantuserid",
                        column: x => x.claimantuserid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_claims_aspnetusers_reviewedbyuserid",
                        column: x => x.reviewedbyuserid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_claims_founditems_founditemid",
                        column: x => x.founditemid,
                        principalTable: "founditems",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "images",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lostitemid = table.Column<Guid>(type: "uuid", nullable: true),
                    founditemid = table.Column<Guid>(type: "uuid", nullable: true),
                    url = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_images", x => x.id);
                    table.ForeignKey(
                        name: "FK_images_founditems_founditemid",
                        column: x => x.founditemid,
                        principalTable: "founditems",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_images_lostitems_lostitemid",
                        column: x => x.lostitemid,
                        principalTable: "lostitems",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "matches",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lostitemid = table.Column<Guid>(type: "uuid", nullable: false),
                    founditemid = table.Column<Guid>(type: "uuid", nullable: false),
                    confidencescore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_matches", x => x.id);
                    table.ForeignKey(
                        name: "FK_matches_founditems_founditemid",
                        column: x => x.founditemid,
                        principalTable: "founditems",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_matches_lostitems_lostitemid",
                        column: x => x.lostitemid,
                        principalTable: "lostitems",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "claimchatconversations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    claimid = table.Column<Guid>(type: "uuid", nullable: false),
                    owneruserid = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    founderuserid = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    closedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    isreadonly = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_claimchatconversations", x => x.id);
                    table.ForeignKey(
                        name: "FK_claimchatconversations_claims_claimid",
                        column: x => x.claimid,
                        principalTable: "claims",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "claimverifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    claimid = table.Column<Guid>(type: "uuid", nullable: false),
                    matchid = table.Column<Guid>(type: "uuid", nullable: true),
                    lostitemid = table.Column<Guid>(type: "uuid", nullable: true),
                    securequestionspayload = table.Column<string>(type: "text", nullable: false),
                    publicquestionsjson = table.Column<string>(type: "text", nullable: false),
                    submittedanswersjson = table.Column<string>(type: "text", nullable: true),
                    evaluationresultjson = table.Column<string>(type: "text", nullable: true),
                    confidencescore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    matchedcount = table.Column<int>(type: "integer", nullable: true),
                    totalquestions = table.Column<int>(type: "integer", nullable: false),
                    passed = table.Column<bool>(type: "boolean", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    attemptcount = table.Column<int>(type: "integer", nullable: false),
                    maxattempts = table.Column<int>(type: "integer", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    submittedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    passedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    securityreviewedbyuserid = table.Column<string>(type: "text", nullable: true),
                    securityreviewedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    securityreviewnote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_claimverifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_claimverifications_claims_claimid",
                        column: x => x.claimid,
                        principalTable: "claims",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "visualembeddings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    imageid = table.Column<Guid>(type: "uuid", nullable: false),
                    model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    vectorjson = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_visualembeddings", x => x.id);
                    table.ForeignKey(
                        name: "FK_visualembeddings_images_imageid",
                        column: x => x.imageid,
                        principalTable: "images",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "claimchatmessages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    conversationid = table.Column<Guid>(type: "uuid", nullable: false),
                    senderuserid = table.Column<string>(type: "text", nullable: false),
                    content = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    sentat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    readat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_claimchatmessages", x => x.id);
                    table.ForeignKey(
                        name: "FK_claimchatmessages_aspnetusers_senderuserid",
                        column: x => x.senderuserid,
                        principalTable: "aspnetusers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_claimchatmessages_claimchatconversations_conversationid",
                        column: x => x.conversationid,
                        principalTable: "claimchatconversations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_airequests_userid",
                table: "airequests",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_aspnetroleclaims_roleid",
                table: "aspnetroleclaims",
                column: "roleid");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "aspnetroles",
                column: "normalizedname",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_aspnetuserclaims_userid",
                table: "aspnetuserclaims",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_aspnetuserlogins_userid",
                table: "aspnetuserlogins",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_aspnetuserroles_roleid",
                table: "aspnetuserroles",
                column: "roleid");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "aspnetusers",
                column: "normalizedemail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "aspnetusers",
                column: "normalizedusername",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_auditlogs_userid",
                table: "auditlogs",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_chatconversations_userid_updatedat",
                table: "chatconversations",
                columns: new[] { "userid", "updatedat" });

            migrationBuilder.CreateIndex(
                name: "IX_chathistories_conversationid_createdat",
                table: "chathistories",
                columns: new[] { "conversationid", "createdat" });

            migrationBuilder.CreateIndex(
                name: "IX_chathistories_userid",
                table: "chathistories",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_claimchatconversations_claimid",
                table: "claimchatconversations",
                column: "claimid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_claimchatmessages_conversationid_sentat",
                table: "claimchatmessages",
                columns: new[] { "conversationid", "sentat" });

            migrationBuilder.CreateIndex(
                name: "IX_claimchatmessages_senderuserid",
                table: "claimchatmessages",
                column: "senderuserid");

            migrationBuilder.CreateIndex(
                name: "IX_claims_claimantuserid",
                table: "claims",
                column: "claimantuserid");

            migrationBuilder.CreateIndex(
                name: "IX_claims_founditemid",
                table: "claims",
                column: "founditemid");

            migrationBuilder.CreateIndex(
                name: "IX_claims_reviewedbyuserid",
                table: "claims",
                column: "reviewedbyuserid");

            migrationBuilder.CreateIndex(
                name: "IX_claimverifications_claimid",
                table: "claimverifications",
                column: "claimid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_claimverifications_matchid",
                table: "claimverifications",
                column: "matchid",
                unique: true,
                filter: "\"matchid\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_feedback_userid",
                table: "feedback",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_floors_buildingid_floornumber",
                table: "floors",
                columns: new[] { "buildingid", "floornumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_founditems_categoryid",
                table: "founditems",
                column: "categoryid");

            migrationBuilder.CreateIndex(
                name: "IX_founditems_locationid",
                table: "founditems",
                column: "locationid");

            migrationBuilder.CreateIndex(
                name: "IX_founditems_userid",
                table: "founditems",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_images_founditemid",
                table: "images",
                column: "founditemid");

            migrationBuilder.CreateIndex(
                name: "IX_images_lostitemid",
                table: "images",
                column: "lostitemid");

            migrationBuilder.CreateIndex(
                name: "IX_locations_buildingid",
                table: "locations",
                column: "buildingid");

            migrationBuilder.CreateIndex(
                name: "IX_locations_floorid",
                table: "locations",
                column: "floorid");

            migrationBuilder.CreateIndex(
                name: "IX_lostitems_categoryid",
                table: "lostitems",
                column: "categoryid");

            migrationBuilder.CreateIndex(
                name: "IX_lostitems_locationid",
                table: "lostitems",
                column: "locationid");

            migrationBuilder.CreateIndex(
                name: "IX_lostitems_userid",
                table: "lostitems",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_matches_founditemid",
                table: "matches",
                column: "founditemid");

            migrationBuilder.CreateIndex(
                name: "IX_matches_lostitemid_founditemid",
                table: "matches",
                columns: new[] { "lostitemid", "founditemid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_notifications_userid",
                table: "notifications",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_reputationhistories_reputationid",
                table: "reputationhistories",
                column: "reputationid");

            migrationBuilder.CreateIndex(
                name: "IX_reputationhistories_userid_relatedentitytype_relatedentityi~",
                table: "reputationhistories",
                columns: new[] { "userid", "relatedentitytype", "relatedentityid", "reason" },
                unique: true,
                filter: "\"relatedentitytype\" IS NOT NULL AND \"relatedentityid\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_reputations_userid",
                table: "reputations",
                column: "userid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_securityofficerrequests_reviewedbyuserid",
                table: "securityofficerrequests",
                column: "reviewedbyuserid");

            migrationBuilder.CreateIndex(
                name: "IX_securityofficerrequests_userid_status",
                table: "securityofficerrequests",
                columns: new[] { "userid", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_supportpayments_merchantinvoicenumber",
                table: "supportpayments",
                column: "merchantinvoicenumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_supportpayments_providerpaymentid",
                table: "supportpayments",
                column: "providerpaymentid",
                unique: true,
                filter: "\"providerpaymentid\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_supportpayments_providertransactionid",
                table: "supportpayments",
                column: "providertransactionid",
                unique: true,
                filter: "\"providertransactionid\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_supportpayments_status_createdat",
                table: "supportpayments",
                columns: new[] { "status", "createdat" });

            migrationBuilder.CreateIndex(
                name: "IX_supportpayments_userid_createdat",
                table: "supportpayments",
                columns: new[] { "userid", "createdat" });

            migrationBuilder.CreateIndex(
                name: "IX_userprofiles_userid",
                table: "userprofiles",
                column: "userid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_visualembeddings_imageid_model",
                table: "visualembeddings",
                columns: new[] { "imageid", "model" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "airequests");

            migrationBuilder.DropTable(
                name: "aspnetroleclaims");

            migrationBuilder.DropTable(
                name: "aspnetuserclaims");

            migrationBuilder.DropTable(
                name: "aspnetuserlogins");

            migrationBuilder.DropTable(
                name: "aspnetuserroles");

            migrationBuilder.DropTable(
                name: "aspnetusertokens");

            migrationBuilder.DropTable(
                name: "auditlogs");

            migrationBuilder.DropTable(
                name: "badges");

            migrationBuilder.DropTable(
                name: "chathistories");

            migrationBuilder.DropTable(
                name: "claimchatmessages");

            migrationBuilder.DropTable(
                name: "claimverifications");

            migrationBuilder.DropTable(
                name: "feedback");

            migrationBuilder.DropTable(
                name: "matches");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "reputationhistories");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "securityofficerrequests");

            migrationBuilder.DropTable(
                name: "supportpayments");

            migrationBuilder.DropTable(
                name: "userprofiles");

            migrationBuilder.DropTable(
                name: "visualembeddings");

            migrationBuilder.DropTable(
                name: "aspnetroles");

            migrationBuilder.DropTable(
                name: "chatconversations");

            migrationBuilder.DropTable(
                name: "claimchatconversations");

            migrationBuilder.DropTable(
                name: "reputations");

            migrationBuilder.DropTable(
                name: "images");

            migrationBuilder.DropTable(
                name: "claims");

            migrationBuilder.DropTable(
                name: "lostitems");

            migrationBuilder.DropTable(
                name: "founditems");

            migrationBuilder.DropTable(
                name: "aspnetusers");

            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropTable(
                name: "locations");

            migrationBuilder.DropTable(
                name: "floors");

            migrationBuilder.DropTable(
                name: "buildings");
        }
    }
}
